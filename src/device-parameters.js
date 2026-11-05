/* Stage 05: immutable device parameter declarations (inverter family first).
 * These describe configuration, labels and defaults; source resolution stays
 * in HASSStudioHA and HASSStudioInverter until a later reviewed stage.
 */
const HASSStudioDeviceParameters=(()=>{
 const fields=entries=>Object.freeze(Object.fromEntries(entries.map(([id,spec])=>
   [id,Object.freeze({id,...spec})])));
 const core=fields([
  ['ac_power',{label:'Moc chwilowa falownika AC (kW)',unit:'kW',kind:'number',
    role:'energy_source',entityPath:'entities.ac_power',manualPath:'manual.ac_power',
    svg:Object.freeze({id:'inv-power',attribute:'text'}),testDefault:6.4,min:-500,max:500}],
  ['temperature',{label:'Temperatura falownika (°C)',unit:'°C',kind:'number',
    role:'telemetry',entityPath:'entities.temperature',manualPath:'manual.temperature',testDefault:32,min:-40,max:150}],
  ['status',{label:'Stan pracy falownika',unit:'',kind:'enum',role:'status',
    entityPath:'entities.status',manualPath:'manual.status',testDefault:'auto',
    options:Object.freeze(['auto','generating','standby','off','fault'])}],
  ['alarm',{label:'Alarm falownika',unit:'',kind:'boolean',role:'alarm',
    entityPath:'entities.alarm',manualPath:'manual.alarm',testDefault:false}]
 ]);
 const pv=fields([
  ['voltage',{label:'Napięcie',unit:'V',kind:'number',role:'pv_input',
    entityPath:'entities.voltage',manualPath:'manual.voltage',testDefault:380,min:0,max:50000}],
  ['current',{label:'Prąd',unit:'A',kind:'number',role:'pv_input',
    entityPath:'entities.current',manualPath:'manual.current',testDefault:8,min:0,max:50000}],
  ['power',{label:'Moc',unit:'W',kind:'number',role:'pv_input',
    entityPath:'entities.power',manualPath:'manual.power',testDefault:null,min:0,max:50000}]
 ]);
 const entity=x=>typeof x==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(x)?x:'';
 const entities=(definitions,raw)=>Object.fromEntries(Object.keys(definitions).map(k=>[k,entity(raw?.[k])]));
 const manualDefaults=definitions=>Object.fromEntries(Object.keys(definitions).map(k=>[k,definitions[k].testDefault]));
 // Default examples are placeholders, not active TEST readings.
 const inputDefaults=i=>({name:'PV'+(i+1),visible:i<3,required:false,
   entities:entities(pv),manual:manualDefaults(pv),
   manual_enabled:{voltage:false,current:false,power:false}});
 const inverter=Object.freeze({core,pv,entity,entities,manualDefaults,inputDefaults,
  coreKeys:Object.freeze(Object.keys(core)),pvKeys:Object.freeze(Object.keys(pv))});
 return Object.freeze({inverter});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioDeviceParameters;
