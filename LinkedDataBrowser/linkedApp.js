/*
 * Module dependencies
 * FINAL WORKING CODE
 */
var express = require('express')
, stylus = require('stylus')
, nib = require('nib')
, SparqlClient = require('sparql-client')
, util = require('util')
, rdfstore = require('rdfstore')
, fs = require('fs')
, XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest
,async = require( 'async' );

var reader = require ("buffered-reader");
var DataReader = reader.DataReader;
var lbProperties = new Array();

var app = express()
function compile(str, path) {
	return stylus(str)
	.set('filename', path)
	.use(nib())
}
app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.use(express.logger('dev'))
app.use(stylus.middleware(
		{ src: __dirname + '/public'
			, compile: compile
		}
))
app.use(express.static(__dirname + '/public'));
function executeSparqlrdfstore(uriParam, languageParam, limit, res)
{
	var uriString = uriParam;
	rdfstore.create(function(store) {
		var query1="Construct { "+uriString+" ?p ?o. ?o rdfs:label ?lbl. ?o foaf:depiction ?dep. ?p rdfs:label ?plbl} where { "+uriString+" ?p ?o. OPTIONAL{?o rdfs:label ?lbl} OPTIONAL{?o foaf:depiction ?dep} OPTIONAL{?p rdfs:label ?plbl} }";
		var query=encodeURIComponent(query1);
		var url=lbProperties["endpoint"]+"?query=" + query + "&format=text%2Fturtle";
		var xmlHttp = null;
		xmlHttp = new XMLHttpRequest();
		xmlHttp.onreadystatechange = ProcessRequest;
		xmlHttp.open( "GET", url, true );
		xmlHttp.send();
		function ProcessRequest()
		{
			if ( xmlHttp.readyState == 4 && xmlHttp.status == 200 )
			{
				var results = xmlHttp.responseText;
				store.setPrefix("ex", lbProperties["prefix"]);
				store.load("text/turtle", results, function(suc, rs){
					store.execute('PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#> PREFIX foaf: <http://xmlns.com/foaf/0.1/> PREFIX : <'+lbProperties["prefix"]+'> SELECT ?x ?y ?z where {?x ?y ?z. FILTER(?x='+uriString+')} ORDER BY ?y', function(success, results) {
						var uriJSONF = convertJSONintoRequiredFormat(results, store, languageParam, limit);
						res.render('index',
								{ param1 : "Smithsonian Data",
							json: uriJSONF}
						)
					});
				});
			}
		}
	})
}
function convertJSONintoRequiredFormat(jsonResult, store, pLanguage, limit)
{
	var internalURI = lbProperties["internalURI"];
	var prefLanguage = pLanguage;		//"fr";
	var jsonItem;
	var convertedJSON = '[';
	var lim = '';
	if(limit > 0)
		lim = 'LIMIT '+limit;
	for (i in jsonResult)
	{		if(jsonItem == jsonResult[i].y.value)
		{if(jsonResult[i].z.token == 'literal')
			{
				convertedJSON = getJSONforLiteral(convertedJSON, jsonResult[i].z.value);
			}
			else if(jsonResult[i].z.token == 'uri')
			{if(jsonResult[i].z.value.indexOf(internalURI) !== -1)
				{
				convertedJSON = getJSONforInternalURI(convertedJSON, store, jsonResult[i].z.value, prefLanguage, lim);
				}
				else
				{
					convertedJSON = getJSONforExternalURI(convertedJSON, jsonResult[i].z.value, 'label');
				}
			}
		}
		else
		{if(!!jsonItem)
			{
				convertedJSON = convertedJSON.substring(0,convertedJSON.length-1);
				convertedJSON = convertedJSON + ']},';
			}
			jsonItem = jsonResult[i].y.value;
			convertedJSON = convertedJSON + '{uri:\"' + encodeURI(jsonResult[i].y.value) + '\",';
			if(jsonItem.indexOf(internalURI) !== -1)
			{
			convertedJSON = getData(convertedJSON, store, 'rdfs:label', jsonItem, prefLanguage, lim, 'label');
			}
			else
			{var URIvalue = jsonItem;
				var lIndex = 0;
				if((URIvalue.substring(URIvalue.lastIndexOf("/"))).length > 2)
				{
					lIndex = URIvalue.lastIndexOf("/")
				}
				else
				{
					lIndex = (URIvalue.substring(0, URIvalue.lastIndexOf("/")-1)).lastIndexOf("/");
				}
				convertedJSON = convertedJSON + getLabelFromURI(URIvalue, lIndex, 'label');
			}
			convertedJSON = convertedJSON + 'values:[';
			if(!!jsonResult[i].z.value)
			{if(jsonResult[i].z.token == 'literal')
				{
					convertedJSON = getJSONforLiteral(convertedJSON, jsonResult[i].z.value);
				}
				else if(jsonResult[i].z.token == 'uri')
				{if(jsonResult[i].z.value.indexOf(internalURI) !== -1)
					{
						convertedJSON = getJSONforInternalURI(convertedJSON, store, jsonResult[i].z.value, prefLanguage, lim);
					}
					else
					{
						convertedJSON = getJSONforExternalURI(convertedJSON, jsonResult[i].z.value, 'label');
					}
				}
			}
		}	
	}
	convertedJSON = convertedJSON.substring(0,convertedJSON.length-1);
	convertedJSON = convertedJSON + ']}]';
	dispMyJSON(convertedJSON);
	var uriJSON = eval('(' + convertedJSON + ')');
	return uriJSON;
}
function getJSONforLiteral(convertedJSON, literal)
{
					convertedJSON = convertedJSON + '{type:\"literal\", value:';
					convertedJSON = convertedJSON + '\"' + escape(literal) + '\"' + '},';
				return convertedJSON;
}
function getJSONforInternalURI(convertedJSON, store, intURI, prefLanguage, lim)
{
						convertedJSON = convertedJSON + '{type:\"internaluri\",';
						convertedJSON = getData(convertedJSON, store, 'rdfs:label', intURI, prefLanguage, lim, 'label');
						convertedJSON = getData(convertedJSON, store, 'foaf:depiction', intURI, prefLanguage, lim, 'depiction');
						convertedJSON = convertedJSON + 'value:'+'\"' + escape(intURI) + '\"' + '},';
				return convertedJSON;
}
function getJSONforExternalURI(convertedJSON, externalURI, propertyKey)
{
convertedJSON = convertedJSON + '{type:\"externaluri\", value:';
						convertedJSON = convertedJSON + '\"' + escape(externalURI) + '\",';
						var URIvalue = externalURI;
						var lIndex = 0;
						if((URIvalue.substring(URIvalue.lastIndexOf("/"))).length > 2)
						{
							lIndex = URIvalue.lastIndexOf("/")
						}
						else
						{
							lIndex = (URIvalue.substring(0, URIvalue.lastIndexOf("/")-1)).lastIndexOf("/");
						}
						convertedJSON = convertedJSON + getLabelFromURI(URIvalue, lIndex, propertyKey) + '},';
			return convertedJSON;
}
function getLabelFromURI(URIvalue, lIndex, propertyKey)
{
						URIvalue = URIvalue.substring(lIndex+1);
						URIvalue = URIvalue.replace("_"," ");
						URIvalue = URIvalue.replace("/"," ");
						lblArray = propertyKey+':'+ '[\"' + escape(URIvalue) + '\"],';
				return lblArray;
}
function getData(convertedJSON, store, propertyName, intURI, prefLanguage, lim, propertyKey)
{
var query = '';
if(propertyKey == 'label')
	query = 'PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#> PREFIX foaf: <http://xmlns.com/foaf/0.1/> PREFIX : <'+lbProperties["prefix"]+'> SELECT ?l where {<'+intURI+'> '+propertyName+' ?l. FILTER (lang(?l)="'+prefLanguage+'") } '+lim;
else
	query = 'PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#> PREFIX foaf: <http://xmlns.com/foaf/0.1/> PREFIX : <'+lbProperties["prefix"]+'> SELECT ?l where {<'+intURI+'> '+propertyName+' ?l. } '+lim
store.execute(query, function(success, results) {
						var resJSON = results[0];
						var resCnt = 0;
						var resArray = '';
						for (var p = 0; p < results.length; p++) {
							for (name in results[p]) {
								resArray = resArray + '\"' + escape(results[p][name]["value"]) + '\",'
								resCnt = resCnt+1;
							}
						}
						if(resCnt > 0)
						{
							resArray = resArray.substring(0,resArray.length-1);
							resArray = propertyKey+':'+ '[' + resArray + '],';
							convertedJSON = convertedJSON + resArray;
						}
						else
						{
							convertedJSON = convertedJSON + getLabelFromURI(intURI, intURI.lastIndexOf("/"), propertyKey);
						}
					});
		return convertedJSON;
}
function dispMyJSON(jsonResult)
{
	var myOBJ = eval('(' + jsonResult + ')');
	//console.log(JSON.stringify(myOBJ));
}
function displaySparql(jsonData)
{
	app.get('/', function (req, res) {
		res.render('index',
				{ param1 : "Smithsonian Data",
			json: jsonData}
		)
	})
}
app.get('/query', function (req, res) {
	async.parallel([executeSparqlrdfstore('<'+req.query.internalUri+'>', req.query.preferredLanguage, req.query.limit, res)]);
})
function readPropertiesFile()
{
var file = __dirname + "/linkedBrowser.properties";
var encoding = "utf8";
new DataReader (file, {encoding: encoding, bufferSize: 1 })
                //This event is emitted on error, the file is closed automatically
                .on ("error", function (error){
                        console.log (error);
                })
                .on ("line", function (line, byteOffset){
                        var prop = line.split("=");
                        lbProperties[prop[0]] = prop[1];
                })
                .on ("end", function (){
                })           
                .read ();
                
}
readPropertiesFile();
app.listen(3000)