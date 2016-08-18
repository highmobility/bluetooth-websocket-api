'use strict';

const EventEmitter = require('events').EventEmitter;
const debug = true;

export default class BTWSCore extends EventEmitter {
  constructor(adapter) {
    super();
    this.adapter = adapter;
    this.devices = {};
  }

  receiveRequest(receiveData) {
    this.emit('user_approval', receiveData);
  }

  requestDevice(options) {
    return navigator.bluetooth.requestDevice(options)
      .then(device => {
        this.devices[device.id] = device;
        this.devices[device.id].addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));
        this.adapter.sendDeviceFound(this.devices[device.id]);

        this.log('Device requested:', this.devices[device.id]);
        return this.devices[device.id];
      })
      .catch(error => {
        this.handleError(error, '01', 'scan', '');
      });
  }

  connect(deviceId) {
    if (!this.devices[deviceId]) { return Promise.reject('[BTWS] Device is not connected.'); }
    let device = this.devices[deviceId];
    return device.gatt.connect()
      .then(server => {
        device.server = server;
        device.services = {};
        this.adapter.sendDeviceConnected(deviceId);

        this.emit('connected');
        this.log('Device Server:', device.server);
      })
      .catch(error => {
        this.handleError(error, '02', 'connect', {device_id: deviceId});
      });
  }

  disconnect(deviceId) {
    if (!this.devices[deviceId]) { return Promise.reject('[BTWS] Device is not connected.'); }
    if (!this.devices[deviceId].gatt.connected) { return Promise.reject('[BTWS] Device is already disconnected.'); }
    let device = this.devices[deviceId];

    this.removeAllActiveNotifications(deviceId);
    device.gatt.disconnect();
    this.adapter.sendDeviceDisconnected(deviceId);

    this.emit('disconnected');
    this.log('Device Connected:', device.gatt.connected);
  }

  onDisconnected(event) {
    this.removeAllActiveNotifications(event.target.id);
    this.adapter.sendDeviceDisconnected(event.target.id);
    this.devices[event.target.id].gatt.disconnect();

    this.emit('disconnected');
    this.log('Device Disconnected:', this.devices[event.target.id]);
  }

  getService(deviceId, serviceUuid) {
    let device = this.devices[deviceId];
    if (device.services[serviceUuid] !== undefined) { return device.services[serviceUuid]; }

    return device.server.getPrimaryService(serviceUuid)
      .then(service => {
        device.services[serviceUuid] = service;
        device.services[serviceUuid].characteristics = {};
        this.adapter.sendServiceFound(deviceId, serviceUuid);

        this.log('Device Service:', device.services[serviceUuid]);
      })
      .catch(error => {
        this.handleError(error, '04', 'discover_service', {device_id: deviceId, service_uuid: serviceUuid});
      })
  }

  getServices() {
    // TODO
  }

  getCharacteristic(deviceId, serviceUuid, characteristicUuid) {
    let service = this.devices[deviceId].services[serviceUuid];

    if (service.characteristics[characteristicUuid] !== undefined) { return service.characteristics[characteristicUuid]; }
    return service.getCharacteristic(characteristicUuid)
      .then(characteristic => {
        service.characteristics[characteristicUuid] = characteristic;
        this.adapter.sendCharacteristicFound(deviceId, serviceUuid, characteristicUuid);
        this.log('Devuce Characteristic:', service.characteristics[characteristicUuid]);
      })
      .catch(error => {
        this.handleError(error, '05', 'discover_characteristic', {device_id: deviceId, service_uuid: serviceUuid, characteristics_uuid: characteristicUuid});
      })
  }

  getCharacteristics(){
    //TODO
  }

  readValue(deviceId, serviceUuid, characteristicUuid) {
    let characteristic = this.devices[deviceId].services[serviceUuid].characteristics[characteristicUuid];

    return characteristic.readValue()
      .then(value => {
        value = value.buffer ? value : new DataView(value);
        if (debug) {
          console.log('[BTWS] Read value (TypedArray):', (this.binaryToTypedArray(value)));
          console.log('[BTWS] Read value (base64):', (this.bufferToBase64(this.binaryToTypedArray(value))));
        }

        this.adapter.sendCharacteristicValueRead(deviceId, serviceUuid, characteristicUuid, this.bufferToBase64(this.binaryToTypedArray(value)));
      })
      .catch(error => {
        this.handleError(error, '10', 'read_characteristic', {device_id: deviceId, service_uuid: serviceUuid, characteristics_uuid: characteristicUuid});
      })
  }

  writeValue(deviceId, serviceUuid, characteristicUuid, value) {
    let data = this.base64ToTypedArray(value);
    let characteristic = this.devices[deviceId].services[serviceUuid].characteristics[characteristicUuid];

    return characteristic.writeValue(data)
      .then(_ => {
        this.adapter.sendCharacteristicValueWritten(deviceId, serviceUuid, characteristicUuid, value);
      })
      .catch(error => {
        this.handleError(error, '11', 'write_characteristic', {device_id: deviceId, service_uuid: serviceUuid, characteristics_uuid: characteristicUuid, characteristic_value: value});
      });
  }

  startNotification(deviceId, serviceUuid, characteristicUuid) {
    let characteristic = this.devices[deviceId].services[serviceUuid].characteristics[characteristicUuid];

    return characteristic.startNotifications()
      .then(_ => {
        characteristic.addEventListener('characteristicvaluechanged', this.handleNotifications.bind(this));
        characteristic.notification = true;
        this.adapter.sendNotificationsStarted(deviceId, serviceUuid, characteristicUuid);
      })
      .catch(error => {
        this.handleError(error, '08', 'start_notification', {device_id: deviceId, service_uuid: serviceUuid, characteristics_uuid: characteristicUuid});
      });
  }

  stopNotification(deviceId, serviceUuid, characteristicUuid) {
    let characteristic = this.devices[deviceId].services[serviceUuid].characteristics[characteristicUuid];

    return characteristic.stopNotifications()
      .then(_ => {
        characteristic.removeEventListener('characteristicvaluechanged', this.handleNotifications.bind(this));
        characteristic.notification = false;

        this.adapter.sendNotificationsStopped(deviceId, serviceUuid, characteristicUuid);
      })
      .catch(error => {
        this.handleError(error, '09', 'stop_notification', {device_id: deviceId, service_uuid: serviceUuid, characteristics_uuid: characteristicUuid});
      });
  }

  handleNotifications(event) {
    let characteristic = event.target;
    const characteristicUuid = characteristic.uuid;
    const result = this.getDeviceAndServiceUuidFromCharacteristicUuid(characteristicUuid);

    let value = characteristic.value;
    value = value.buffer ? value : new DataView(value);

    this.adapter.sendNotificationsReceived(result.device_id, result.service_uuid, characteristicUuid, (this.bufferToBase64(this.binaryToTypedArray(value))));
    if (debug) console.log('[BTWS] Notification, value changed:', (this.bufferToBase64(this.binaryToTypedArray(value))));
  }

  //
  // BLE Utils
  //

  handleError(error, errorCode, event, payload) {
    this.adapter.sendError(error.toString(), errorCode, event, payload);
    this.logError(error);
  }

  getCharacteristicNotificationsIsActive(deviceId) {
    let device = this.devices[deviceId];
    let characteristics = [];
    Object.keys(device.services).forEach(serviceUuid => {
      let service = device.services[serviceUuid];
      Object.keys(service.characteristics).forEach(characteristicUuid => {
        if (service.characteristics[characteristicUuid].notification) {
          characteristics.push({
            service_uuid: serviceUuid,
            characteristic_uuid: characteristicUuid
          });
        }
      });
    });
    return characteristics;
  }

  getDeviceAndServiceUuidFromCharacteristicUuid(characteristicUuid) {
    let result = {};
    const serviceUuid = this.getServiceUuidFromCharacteristicUuid(characteristicUuid);
    Object.keys(this.devices).forEach(deviceId => {
      if (serviceUuid in this.devices[deviceId].services) result = {
        'device_id': deviceId,
        'service_uuid': serviceUuid
      };
    });
    return result;
  }

  getServiceUuidFromCharacteristicUuid(characteristicUuid) {
    let result = null;
    Object.keys(this.devices).forEach(deviceId => {
      let services = this.devices[deviceId].services;
      Object.keys(services).forEach(serviceId => {
        if (characteristicUuid in services[serviceId].characteristics) result = serviceId;
      });
    });
    return result;
  }

  removeAllActiveNotifications(deviceId){
    let device = this.devices[deviceId];
    let notificationStartedCharacteristics = this.getCharacteristicNotificationsIsActive(deviceId);
    if (notificationStartedCharacteristics.length > 0) {
      notificationStartedCharacteristics.map(target => {
        let characteristic = device.services[target.service_uuid].characteristics[target.characteristic_uuid];
        characteristic.stopNotifications()
          .then(_ => {
            characteristic.removeEventListener('characteristicvaluechanged', this.handleNotifications);
          })
          .catch(error => {
            this.handleError(error, '09', 'stop_notification', {device_id: deviceId, service_uuid: target.service_uuid, characteristics_uuid: target.characteristic_uuid});
          });
      })
    }
  }

  //
  // Log Utils
  //

  log(args) {
    if (debug) {
      console.log('[BTWS]', args);
    }
  }

  logError(error, args) {
    if (debug) {
      console.log('[BTWS][ERROR]', error, args);
    }
  }

  //
  // Data Conversion Utils
  //

  binaryToTypedArray(value){
    let array = [];
    for (let i = 0; i < value.byteLength; i++) {
      array.push('0x' + ('00' + value.getUint8(i).toString(16)).slice(-2));
    }

    return new Uint8Array(array);
  }

  bufferToBase64(buf) {
    let binstr = Array.prototype.map.call(buf, ch => {
      return String.fromCharCode(ch);
    }).join('');

    return btoa(binstr);
  }

  unicodeStringToTypedArray(s) {
    const escstr = encodeURIComponent(s);

    const binstr = escstr.replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode('0x' + p1);
    });

    const ua = new Uint8Array(binstr.length);
    Array.prototype.forEach.call(binstr, (ch, i) => {
      ua[i] = ch.charCodeAt(0);
    });

    return ua;
  }

  base64ToTypedArray(b64encoded) {
    return new Uint8Array(atob(b64encoded).split('').map(c => c.charCodeAt(0)));
  }

}
