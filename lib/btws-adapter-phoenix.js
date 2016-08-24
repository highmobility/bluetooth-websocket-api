import * as phoenix from 'phoenix-js';
import BTWSBaseAdapter from '../lib/btws-adapter';

export default class BTWSPhoenixAdapter extends BTWSBaseAdapter {
  constructor(param, channelName){
    super();

    if (this.isPhoenixSocket(param)) {
      this.socket = param;
    } else if (this.isValidEndPoint(param)) {
      this.socket = new phoenix.Socket(param);
    } else {
      throw new Error('Invalid argument for PhoenixAdapter, please pass in an URL or a Phoenix socket instance.');
    }

    this.channel = this.connect(channelName);
    this.initSocketEvent();
  }

  connect(channelName){
    this.socket.connect();
    let channel = this.socket.channel(channelName, {});

    channel.join()
      .receive('ok', resp => { this.core.log('Joined ', channelName, resp) } )
      .receive('error', resp => { this.core.logError('Unable to join ', channelName, resp) })
    return channel;
  }

  initSocketEvent() {
    const event = this.RECEIVE_EVENT;
    let channel = this.channel;

    channel.on(event.REQUEST_DEVICE, msg => {
      this.core.log(event.REQUEST_DEVICE, msg);
      this.core.receiveRequest(msg);
    });

    channel.on(event.CONNECT_DEVICE, msg => {
      this.core.log(event.CONNECT_DEVICE, msg);
      this.core.connect(msg.device_id);
    });

    channel.on(event.DISCONNECT_DEVICE, msg => {
      this.core.log(event.DISCONNECT_DEVICE, msg);
      this.core.disconnect(msg.device_id);
    });

    channel.on(event.DISCOVER_SERVICE, msg => {
      this.core.log(event.DISCOVER_SERVICE, msg);
      this.core.getService(msg.device_id, msg.service_uuid.toLowerCase());
    });

    channel.on(event.DISCOVER_CHARACTERISTIC, msg => {
      this.core.log(event.DISCOVER_CHARACTERISTIC, msg);
      this.core.getCharacteristic(msg.device_id, msg.service_uuid.toLowerCase(), msg.characteristic_uuid.toLowerCase());
    });

    channel.on(event.READ_CHARACTERISTIC_VALUE, msg => {
      this.core.log(event.READ_CHARACTERISTIC_VALUE, msg);
      this.core.readValue(msg.device_id, msg.service_uuid.toLowerCase(), msg.characteristic_uuid.toLowerCase());
    });

    channel.on(event.WRITE_CHARACTERISTIC_VALUE, msg => {
      this.core.log(event.WRITE_CHARACTERISTIC_VALUE, msg);
      this.core.writeValue(msg.device_id, msg.service_uuid.toLowerCase(), msg.characteristic_uuid.toLowerCase(), msg.characteristic_value);
    });

    channel.on(event.START_NOTIFICATIONS, msg => {
      this.core.log(event.START_NOTIFICATIONS, msg);
      this.core.startNotification(msg.device_id, msg.service_uuid.toLowerCase(), msg.characteristic_uuid.toLowerCase());
    });

    channel.on(event.STOP_NOTIFICATIONS, msg => {
      this.core.log(event.STOP_NOTIFICATIONS, msg);
      this.core.stopNotification(msg.device_id, msg.service_uuid.toLowerCase(), msg.characteristic_uuid.toLowerCase());
    });

  }

  sendDeviceFound(device) {
    const adData = this.setAdData(device);

    this.channel.push(this.SEND_EVENT.DEVICE_FOUND, {
      name: device.name,
      device_id: device.id,
      advertised_services: adData.advertised_services,
      manufacture_data: adData.manufacture_data,
      tx_power: adData.tx_power,
      rssi: adData.rssi
    });
  }

  sendDeviceConnected(deviceId) {
    this.channel.push(this.SEND_EVENT.DEVICE_CONNECTED, {
      device_id: deviceId
    });
  }

  sendDeviceDisconnected(deviceId) {
    this.channel.push(this.SEND_EVENT.DEVICE_DISCONNECTED, {
      device_id: deviceId
    });
  }

  sendServiceFound(deviceId, serviceUuid) {
    this.channel.push(this.SEND_EVENT.SERVICE_FOUND, {
      device_id: deviceId,
      service_uuid: serviceUuid
    });
  }

  sendCharacteristicFound(deviceId, serviceUuid, characteristicUuid) {
    this.channel.push(this.SEND_EVENT.CHARACTERISTIC_FOUND, {
      device_id: deviceId,
      service_uuid: serviceUuid,
      characteristic_uuid: characteristicUuid
    });
  }

  sendCharacteristicValueRead(deviceId, serviceUuid, characteristicUuid, value) {
    this.channel.push(this.SEND_EVENT.CHARACTERISTIC_VALUE_READ, {
      device_id: deviceId,
      service_uuid: serviceUuid,
      characteristic_uuid: characteristicUuid,
      characteristic_value: value
    });
  }

  sendCharacteristicValueWritten(deviceId, serviceUuid, characteristicUuid, value) {
    this.channel.push(this.SEND_EVENT.CHARACTERISTIC_VALUE_WRITTEN, {
      device_id: deviceId,
      service_uuid: serviceUuid,
      characteristic_uuid: characteristicUuid,
      characteristic_value: value
    });
  }

  sendNotificationsStarted(deviceId, serviceUuid, characteristicUuid) {
    this.channel.push(this.SEND_EVENT.NOTIFICATIONS_STARTED, {
      device_id: deviceId,
      service_uuid: serviceUuid,
      characteristic_uuid: characteristicUuid
    });
  }

  sendNotificationsStopped(deviceId, serviceUuid, characteristicUuid) {
    this.channel.push(this.SEND_EVENT.NOTIFICATIONS_STOPPED, {
      device_id: deviceId,
      service_uuid: serviceUuid,
      characteristic_uuid: characteristicUuid
    });
  }

  sendNotificationsReceived(deviceId, serviceUuid, characteristicUuid, value) {
    this.channel.push(this.SEND_EVENT.NOTIFICATION_RECEIVED, {
      device_id: deviceId,
      service_uuid: serviceUuid,
      characteristic_uuid: characteristicUuid,
      characteristic_value: value
    });
  }

  sendError(reason, code, event, payload) {
    this.channel.push(this.SEND_EVENT.error, {
      error_reason: reason,
      error_code: code,
      failed_event: event,
      event_payload: payload
    });
  }

  isPhoenixSocket(obj) {
    return obj.constructor.name === 'Socket' && obj.conn !== undefined
  }

}
