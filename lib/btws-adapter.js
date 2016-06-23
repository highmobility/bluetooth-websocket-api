'use strict';

import BTWSCore from '../lib/btws-core';

export default class BTWSBaseAdapter {
  constructor() {
    this.device = new BTWSCore(this);
    this.RECIEVE_EVENT = {
      request_device              : 'request_device',
      connect_device              : 'connect_device',
      disconnect_device           : 'disconnect_device',
      discover_service            : 'discover_service',
      discover_characteristic     : 'discover_characteristic',
      read_characteristic_value   : 'read_characteristic_value',
      write_characteristic_value  : 'write_characteristic_value',
      start_notifications         : 'start_notifications',
      stop_notifications          : 'stop_notifications'
    };
    this.SEND_EVENT = {
      device_found                  : 'device_found',
      device_connected              : 'device_connected',
      device_disconnected           : 'device_disconnected',
      service_found                 : 'service_found',
      characteristic_found          : 'characteristic_found',
      characteristic_value_read     : 'characteristic_value_read',
      characteristic_value_written  : 'characteristic_value_written',
      notifications_started         : 'notifications_started',
      notifications_stopped         : 'notifications_stopped',
      notification_received         : 'notification_received',
      error                         : 'error'
    };

    if (this === BTWSBaseAdapter) {
      throw new TypeError('Cannot construct Abstract instances directly');
    }

  }

  connect() {
  }

  initSocketEvent() {
  }

  sendDeviceFound() {
  }

  sendDeviceConnected() {
  }

  sendDeviceDisconnected() {
  }

  sendServiceFound() {
  }

  sendCharacteristicFound() {
  }

  sendCharacteristicValueRead() {
  }

  sendCharacteristicValueWritten() {
  }

  sendNotificationsStarted() {
  }

  sendNotificationsStopped() {
  }

  sendNotificationsReceived() {
  }

  ///
  /// Utils
  ///

  on(eventName, callback) {
    this.device.on(eventName, callback);
  }

  isValidEndPoint(str) {
    return (typeof(str) == 'string' || str instanceof String ) && str.startsWith('wss://')
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