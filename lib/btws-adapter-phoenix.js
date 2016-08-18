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
    const event = this.RECIEVE_EVENT;
    let channel = this.channel;

    channel.on(event.request_device, msg => {
      this.core.log(event.request_device, msg);
      this.core.receiveRequest(msg);
    });

    channel.on(event.connect_device, msg => {
      this.core.log(event.connect_device, msg);
      this.core.connect(msg.device_id);
    });

    channel.on(event.disconnect_device, msg => {
      this.core.log(event.disconnect_device, msg);
      this.core.disconnect(msg.device_id);
    });

    channel.on(event.discover_service, msg => {
      this.core.log(event.discover_service, msg);
      this.core.getService(msg.device_id, msg.service_uuid.toLowerCase());
    });

    channel.on(event.discover_characteristic, msg => {
      this.core.log(event.discover_characteristic, msg);
      this.core.getCharacteristic(msg.device_id, msg.service_uuid.toLowerCase(), msg.characteristic_uuid.toLowerCase());
    });

    channel.on(event.read_characteristic_value, msg => {
      this.core.log(event.read_characteristic_value, msg);
      this.core.readValue(msg.device_id, msg.service_uuid.toLowerCase(), msg.characteristic_uuid.toLowerCase());
    });

    channel.on(event.write_characteristic_value, msg => {
      this.core.log(event.write_characteristic_value, msg);
      this.core.writeValue(msg.device_id, msg.service_uuid.toLowerCase(), msg.characteristic_uuid.toLowerCase(), msg.characteristic_value);
    });

    channel.on(event.start_notifications, msg => {
      this.core.log(event.start_notifications, msg);
      this.core.startNotification(msg.device_id, msg.service_uuid.toLowerCase(), msg.characteristic_uuid.toLowerCase());
    });

    channel.on(event.stop_notifications, msg => {
      this.core.log(event.stop_notifications, msg);
      this.core.stopNotification(msg.device_id, msg.service_uuid.toLowerCase(), msg.characteristic_uuid.toLowerCase());
    });

  }

  sendDeviceFound(device) {
    const adData = this.setAdData(device);

    this.channel.push(this.SEND_EVENT.device_found, {
      name: device.name,
      device_id: device.id,
      advertised_services: adData.advertised_services,
      manufacture_data: adData.manufacture_data,
      tx_power: adData.tx_power,
      rssi: adData.rssi
    });
  }

  sendDeviceConnected(deviceId) {
    this.channel.push(this.SEND_EVENT.device_connected, {
      device_id: deviceId
    });
  }

  sendDeviceDisconnected(deviceId) {
    this.channel.push(this.SEND_EVENT.device_disconnected, {
      device_id: deviceId
    });
  }

  sendServiceFound(deviceId, serviceUuid) {
    this.channel.push(this.SEND_EVENT.service_found, {
      device_id: deviceId,
      service_uuid: serviceUuid
    });
  }

  sendCharacteristicFound(deviceId, serviceUuid, characteristicUuid) {
    this.channel.push(this.SEND_EVENT.characteristic_found, {
      device_id: deviceId,
      service_uuid: serviceUuid,
      characteristic_uuid: characteristicUuid
    });
  }

  sendCharacteristicValueRead(deviceId, serviceUuid, characteristicUuid, value) {
    this.channel.push(this.SEND_EVENT.characteristic_value_read, {
      device_id: deviceId,
      service_uuid: serviceUuid,
      characteristic_uuid: characteristicUuid,
      characteristic_value: value
    });
  }

  sendCharacteristicValueWritten(deviceId, serviceUuid, characteristicUuid, value) {
    this.channel.push(this.SEND_EVENT.characteristic_value_written, {
      device_id: deviceId,
      service_uuid: serviceUuid,
      characteristic_uuid: characteristicUuid,
      characteristic_value: value
    });
  }

  sendNotificationsStarted(deviceId, serviceUuid, characteristicUuid) {
    this.channel.push(this.SEND_EVENT.notifications_started, {
      device_id: deviceId,
      service_uuid: serviceUuid,
      characteristic_uuid: characteristicUuid
    });
  }

  sendNotificationsStopped(deviceId, serviceUuid, characteristicUuid) {
    this.channel.push(this.SEND_EVENT.notifications_stopped, {
      device_id: deviceId,
      service_uuid: serviceUuid,
      characteristic_uuid: characteristicUuid
    });
  }

  sendNotificationsReceived(deviceId, serviceUuid, characteristicUuid, value) {
    this.channel.push(this.SEND_EVENT.notification_received, {
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
