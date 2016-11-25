const addon = require('./build/Release/binding.node')
const BacnetValue = addon.BacnetValue
const EventEmitter = require('events').EventEmitter

function flattenConfig (config) {
  // I've flattened the config as I had trouble getting nested properties in the c++
  const flatConfig = config.hasOwnProperty('dataLink') ? config.dataLink : {}
  if (config.hasOwnProperty('device_instance_id')) {
    flatConfig.device_instance_id = config.device_instance_id
  }
  return flatConfig
}

function addCallback (self, invokeId, callback, invocationType) {
  if (invokeId <= 0) throw new Error(`Invoking BACnet ${invocationType} failed`)
  if (callback !== undefined) {
    if (typeof callback !== 'function') throw new TypeError('non-function passed as callback argument')
    self.__callbacks[invokeId] = callback
  }
  return invokeId
}

function executeCallback (self, invokeId, cbErr, cbRes) {
  if (self.__callbacks.hasOwnProperty(invokeId)) {
    const invocationCallback = self.__callbacks[invokeId]
    delete self.__callbacks[invokeId]
    try {
      invocationCallback(cbErr, cbRes)
    } catch (err) {
      console.log('Error in callback', err.stack)
      self.emit('error', err)
    }
  }
}

class Bacnet extends EventEmitter {

  constructor (config) {
    super()
    const self = this

    self.__callbacks = {}
    self.__bacnet = addon.init(flattenConfig(config))

    self.__bacnet.initClient(self)
    if (config && config.device) {
      self.__bacnet.initDevice()
    }
    self.__bacnet.listen()

    self.on('ack', function onAck (invokeId, response) {
      executeCallback(self, invokeId, null, response)
    })

    self.on('abort', function onAbort (invokeId, reason) {
      console.log('abort', invokeId)
      executeCallback(self, invokeId, new Error(reason))
    })

    self.on('reject', function onReject (invokeId, reason) {
      console.log('abort', invokeId)
      executeCallback(self, invokeId, new Error(reason))
    })

    self.on('error-ack', function onErrorAck (invokeId, error) {
      console.log('error-ack', invokeId, error)
      executeCallback(self, invokeId, new Error(`Error received in acknowledgment for request #${invokeId} ${error['error-class']}/${error['error-code']}`))
    })
  }

  static get BacnetValue () {
    return BacnetValue
  }

  static objectTypeToString () {
    return addon.objectTypeToString.apply(addon, arguments)
  }

  static objectTypeToNumber () {
    return addon.objectTypeToNumber.apply(addon, arguments)
  }

  static propertyKeyToString () {
    return addon.propertyKeyToString.apply(addon, arguments)
  }

  static propertyKeyToNumber () {
    return addon.propertyKeyToNumber.apply(addon, arguments)
  }

  closeQueue () {
    return this.__bacnet.closeQueue.apply(this.__bacnet, arguments)
  }

  whois () {
    return this.__bacnet.whois.apply(this.__bacnet, arguments)
  }

  // noinspection JSUnusedGlobalSymbols
  isBound () {
    return this.__bacnet.isBound.apply(this.__bacnet, arguments)
  }

  readProperty (deviceInstance, objectType, objectInstance, property, arrayIndex, callback = () => true) {
    if (!objectType) throw new TypeError('Expected an object type, got : ' + objectType)
    const invokeId = this.__bacnet.readProperty(deviceInstance, addon.objectTypeToNumber(objectType), objectInstance, addon.propertyKeyToNumber(property), arrayIndex)
    return addCallback(this, invokeId, callback, 'read')
  }

  writeProperty (deviceInstance, objectType, objectInstance, property, arrayIndex, value, priority = () => true, callback = priority) {
    if (!objectType) throw new TypeError('Expected an object type, got : ' + objectType)
    value = value instanceof BacnetValue ? value : new BacnetValue(value)
    priority = callback === priority ? undefined : priority
    const invokeId = this.__bacnet.writeProperty(deviceInstance, addon.objectTypeToNumber(objectType), objectInstance, addon.propertyKeyToNumber(property), arrayIndex, value, priority)
    return addCallback(this, invokeId, callback, 'write')
  }

}

module.exports = Bacnet
