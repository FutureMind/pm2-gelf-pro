const pm2 = require('pm2');
const pmx = require('pmx'); // docs say pmx is deprecated, module:generate still uses it, I confuze
const gelflog = require('gelf-pro');
const os = require('os');

const conf = pmx.initModule({
  widget: {
    logo: 'https://app.keymetrics.io/img/logo/keymetrics-300.png',
    theme: ['#141A1F', '#222222', '#3ff', '#3ff'],
  },
});

const errEnabled = (typeof conf.errEnabled === 'undefined') ? true:conf.errEnabled;
const outEnabled = (typeof conf.outEnabled === 'undefined') ? true:conf.outEnabled;


gelflog.setConfig({
  adapterName: conf.gelfAdapterName,
  adapterOptions: {
    host: conf.graylogHost,
    port: conf.graylogPort,
  },
});

if (conf.graylogFields) {
  try {
    const fields = JSON.parse(conf.graylogFields);

    gelflog.setConfig({ fields });
  } catch (ex) {
    console.log(`Could not parse JSON ${ex}`); // eslint-disable-line no-console
  }
}

pm2.Client.launchBus((err, bus) => {
  if (err) return;

  bus.on('log:out', (log) => {
    if (log.process.name === 'pm2-gelf-pro') return;
    console.log(outEnabled);
    if (!outEnabled) return;
    const extra = {machine: os.hostname(), app: log.process.name};
    gelflog.info(log.data, extra);
  });

  bus.on('log:err', (log) => {
    if (log.process.name === 'pm2-gelf-pro') return;
    if (!errEnabled) return;
    const extra = {machine: os.hostname, app: log.process.name};
    gelflog.error(log.data, extra);
  });

  bus.on('close', () => {
    pm2.disconnectBus();
  });
});

module.exports = {
  gelflog,
};
