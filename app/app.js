'use strict';

import BTWSPhoenixAdapter from '../lib/btws-adapter-phoenix';
import * as phoenix from 'phoenix-js';

export default class App {
  constructor(){

    // Create socket sample
    this.sampleSocket = new phoenix.Socket('wss://localhost:4000/socket');
    this.sampleSocket.connect();
    
    // You can also join any other channels:
    // this.sampleSocket.chan = this.sampleSocket.channel('hm:api', {});
    // this.sampleSocket.chan.join()
    //   .receive('ok', resp => { console.log('Joined successfully to hm:api', resp)})
    //   .receive('error', resp => { console.log('Unable to join hm:api', resp) })
    //
    // this.sampleSocket.chan.on('receive_event_sample', msg => { console.log(msg);});
    // this.sampleSocket.chan.push('send_event_sample', {});

    // Pass endPoint or Socket Object to Adapter
    // You can also use like this
    // this.adapter = new BTWSPhoenixAdapter('wss://192.168.233.157:4443/socket');
    this.adapter = new BTWSPhoenixAdapter(this.sampleSocket, 'bws:battery');

    this.adapter.on('connected', _ => document.querySelector('#state').classList.add('connected'));
    this.adapter.on('disconnected', _ => document.querySelector('#state').classList.remove('connected'));
    this.adapter.on('user_approval', data => this.showApproval(data));
    this.adapter.on('error', error => alert(error));
  }

  showApproval(data){
    document.querySelector('#approval').innerHTML = `<div>${data.services}(${data.name})</div>`;
    document.querySelector('#connect').addEventListener('click', _ => this.adapter.requestDevice(data));
  }

}

window.app = new App();
