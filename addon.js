// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
// M3u from https://github.com/iptv-org/iptv

const { addonBuilder } = require("stremio-addon-sdk");
const package = require('./package.json');
var request = require('request');

// if loaded trough PimpMyStremio use the internal proxy
let proxy;
try {
	proxy = require('internal').proxy;
} catch (error) {
	proxy = { addProxy:(s)=>s };
}

const countries = {'Entertainment':'Entertainment','Documentary':'Documentary','Kids':'/s/uai354u9rctgo5u/kids','Music':'/s/iing8o5fjsi0atq/music','Sky Cinema':'/s/c4yyis3j64uk6u4/Sky%20Cinema','Sky Sport':'/s/wlxezlmmxadbyq7/Sky%20Sports','BT Sport':'/s/u9dq6jo0r51wi83/BT%20Sports','UK Sport':'/s/micbumpymagwxjj/UK%20Sports','Dazn':'/s/g00s30biqbvlola/Dazn','Optus Sport':'/s/36tmuogh378jghc/Optus%20Sports','SuperSport':'/s/qha5sv43to8che1/SuperSport'}

const oneDay = 60 * 60 * 24 // in seconds

const cache = {
	maxAge: 1 * oneDay, 
	staleError: 6 * 30 * oneDay 
}

const search_cache = {
	timestamp: 0,
	data: {}
}

const manifest = {
	id: "JL New IPTV",
	version: package.version,
	logo: "https://www.dropbox.com/s/y1qle6s8x1fh5sg/Top-Dog-IPTV.jpg?dl=1",
	catalogs: [{type:'tv',id:'JL New IPTV',name:'JL New IPTV',extra: [
		{
		  name: "genre",
		  options: Object.keys(countries),
		  isRequired: true
		}
	  ]},{
		type: 'tv',
		id: 'JL New IPTV_search',
		name: 'search',
		extra: [
			{
				  name: 'search',
				  isRequired: true
			}
		  ]
	  }],
	resources: ["catalog", "meta", "stream"],
	types: ['tv'],
	name: "JL New IPTV",
	description: "Collection Of Cracked UK IPTV",
	idPrefixes: ['JL New IPTV']
}
function match(r,s,i){
	var m = s.match(r);
	return (m && m.length>i)?m[i]:''
}

function getSearch(){
	return new Promise((resolve, reject) => {
		const now = Math.round(Date.now()/1000);
		if(search_cache.timestamp<now-cache.maxAge){
			request('https://www.dropbox.com/s/u9dq6jo0r51wi83/BT%20Sports.m3u?dl=1', function (error, response, body) {
				if(error){
					reject(error);
				}else if (!response || response.statusCode!=200 ){
					reject(response.statusCode);
				}else if (body){
					search_cache.timestamp = Math.round(Date.now()/1000);
					search_cache.data = m3uToMeta(body);
					resolve(search_cache.data);
				}
			});
		}else{
			resolve(search_cache.data);
		}

	});
}

function m3uToMeta(data,country){
	if(country==undefined) country='search';
	var channels = data.split('#');
	var metas = [];
	var metaID = {};
	for (let i = 1; i < channels.length; i++) {
		const item = channels[i];
		var name = match(/,([^\n]+)/,item,1).trim();
		if(!name) continue;
		var img = match(/tvg-logo="([^"]+)"/,item,1);
		var stream = match(/\n(http[^\n]+)/,item,1);
		var id ='JL New IPTV:'+country+'::'+name;
		if(metaID[id]==undefined){
			metaID[id] = metas.length;
			metas.push({
				id:id,
				name:name,
				logo:img,
				poster:img,
				posterShape: 'landscape',
				type:'tv',
				streams:[]
			});
			metas[metaID[id]] = metas[metaID[id]]
		}
		const pathdata = stream.split('/');
		metas[metaID[id]].streams.push({
			title: pathdata[2]+'/'+pathdata[pathdata.length-1].replace(/\.m3u8$/,''),
			url: proxy.addProxy(stream)
		});
	}
	return metas;
}

const builder = new addonBuilder(manifest)
function getData(country){
	if(!country) country='United States';
	if(country == 'search'){
		return getSearch();
	}
	return new Promise((resolve, reject) => {
		var url = 'https://www.dropbox.com'+countries[country]+'.m3u?dl=1';
		if (countries[country]=='Entertainment'){
			url = 'https://www.dropbox.com/s/w2yeqfp0wd701w2/Entertainment.m3u?dl=1';
		}else if (countries[country]=='Documentary'){
			url = 'https://www.dropbox.com/s/vn2z4jvf47ly3rt/Documentary.m3u?dl=1';
		}
		request(url, function (error, response, body) {
			if(error){
				reject(error);
			}else if (!response || response.statusCode!=200 ){
				reject(response.statusCode);
			}else if (body){
				resolve(m3uToMeta(body,country));
			}
		});
	});
}


// 
builder.defineCatalogHandler(function(args, cb) {
	// filter the dataset object and only take the requested type
	return new Promise((resolve, reject) => {
		if (args.id == 'JL New IPTV_search'){
			if(!args.extra.search){
				return resolve({});
			}
			const search = args.extra.search.toLowerCase().split(/[^a-zA-Z0-9]/);
			getSearch().then(function(values){
				var found = [];
				for (let i = 0; i < values.length; i++) {
					const meta = values[i];
					const name =  meta.name.toLowerCase().split(/[^a-zA-Z0-9]/);
					var match = true;
					for (let s = 0; s < search.length; s++) {
						const word = search[s];
						if(!name.includes(word)){
							match = false;
							break;
						}
					}
					if(match){
						found.push(meta);
					}
				}
				resolve({
					metas:found,
					cacheMaxAge: cache.maxAge,
					staleError: cache.staleError
				});
			});
		}else{
			getData(args.extra.genre).then(function(values) {
				resolve({
					metas:values,
					cacheMaxAge: cache.maxAge,
					staleError: cache.staleError
				});
			}).catch((e)=>{
				reject(e);
			});
		}

	});
});

// takes function(args, cb)
builder.defineStreamHandler(function(args, cb) {
	if (args.type === 'tv' && args.id.startsWith('JL New IPTV:')) {
		return new Promise((resolve, reject) => {
			genr = args.id.split(':',2)[1].split('::')[0];
			getData(genr).then(function(values) {
				for (let i = 0; i < values.length; i++) {
					if(values[i].id == args.id){
						return resolve({
							streams:values[i].streams,
							cacheMaxAge: cache.maxAge,
							staleError: cache.staleError
						});
					}
				}
				resolve({ streams: [] });
			}).catch((e)=>{
				reject(e);
			});
		});
    } else {
        // otherwise return no streams
        return Promise.resolve({ streams: [] })
    }
})

builder.defineMetaHandler(function(args) {
	if (args.type === 'tv' && args.id.startsWith('JL New IPTV:')) {
		return new Promise((resolve, reject) => {
			genr = args.id.split(':',2)[1].split('::')[0];
			getData(genr).then(function(values) {
				for (let i = 0; i < values.length; i++) {
					if(values[i].id == args.id){
						return resolve({
							meta:values[i],
							cacheMaxAge: cache.maxAge,
							staleError: cache.staleError});
					}
				}
				resolve({ streams: [] })
			}).catch((e)=>{
				reject(e);
			});
		});
    } else {
        // otherwise return no streams
        return Promise.resolve({ streams: [] })
    }

})
module.exports = builder.getInterface()
