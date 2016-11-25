export interface bacnet {
    initClient: Function
    initDevice: Function
    listen: Function
    closeQueue: Function
    whois: Function
    isBound: Function
    writeProperty: Function
    readProperty: Function
}

declare module "./build/Release/binding.node" {
    export function init(config:Object):bacnet
    export function objectTypeToString(oT:any):string
    export function objectTypeToNumber(pK:any):number
    export function propertyKeyToString(pK:any):string
    export function propertyKeyToNumber(pK:any):number
}