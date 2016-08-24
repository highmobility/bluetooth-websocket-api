'use strict';

import BTWSCore from '../lib/btws-core';

const RECEIVE_EVENT = {
  REQUEST_DEVICE              : 'request_device',
  CONNECT_DEVICE              : 'connect_device',
  DISCONNECT_DEVICE           : 'disconnect_device',
  DISCOVER_SERVICE            : 'discover_service',
  DISCOVER_CHARACTERISTIC     : 'discover_characteristic',
  READ_CHARACTERISTIC_VALUE   : 'read_characteristic_value',
  WRITE_CHARACTERISTIC_VALUE  : 'write_characteristic_value',
  START_NOTIFICATIONS         : 'start_notifications',
  STOP_NOTIFICATIONS          : 'stop_notifications'
};
const SEND_EVENT = {
  DEVICE_FOUND                  : 'device_found',
  DEVICE_CONNECTED              : 'device_connected',
  DEVICE_DISCONNECTED           : 'device_disconnected',
  SERVICE_FOUND                 : 'service_found',
  CHARACTERISTIC_FOUND          : 'characteristic_found',
  CHARACTERISTIC_VALUE_READ     : 'characteristic_value_read',
  CHARACTERISTIC_VALUE_WRITTEN  : 'characteristic_value_written',
  NOTIFICATIONS_STARTED         : 'notifications_started',
  NOTIFICATIONS_STOPPED         : 'notifications_stopped',
  NOTIFICATION_RECEIVED         : 'notification_received',
  ERROR                         : 'error'
};

export default class BTWSBaseAdapter {

  get RECIEVE_EVENT() {
    return RECEIVE_EVENT;
  }
  get SEND_EVENT() {
    return SEND_EVENT;
  }

  constructor() {
    this.core = new BTWSCore(this);
    if (this === BTWSBaseAdapter) {
      throw new TypeError('Cannot create an instance of the BTWSBaseAdapter, please use any of the drivers implementing this class.');
    }
  }

  connect() {}

  initSocketEvent() {}

  sendDeviceFound() {}

  sendDeviceConnected() {}

  sendDeviceDisconnected() {}

  sendServiceFound() {}

  sendCharacteristicFound() {}

  sendCharacteristicValueRead() {}

  sendCharacteristicValueWritten() {}

  sendNotificationsStarted() {}

  sendNotificationsStopped() {}

  sendNotificationsReceived() {}

  requestDevice(options) {
    this.core.requestDevice(options);
  }

  on(eventName, callback) {
    this.core.on(eventName, callback);
  }

  isValidEndPoint(str) {
    return (typeof(str) == 'string' || str instanceof String ) && str.startsWith('wss://');
  }

  setAdData(device) {
    const obj = {};
    obj.advertised_services = (device.adData !== undefined && device.adData.serviceData !== undefined) ? device.adData.serviceData : null;
    obj.manufacture_data = (device.adData !== undefined && device.adData.manufactureData !== undefined) ? device.adData.manufactureData : null;
    obj.tx_power = (device.adData !== undefined && device.adData.txPower !== undefined) ? device.adData.txPower : null;
    obj.rssi = (device.adData !== undefined && device.adData.rssi !== undefined) ? device.adData.rssi : null;
    return obj;
  }
}
