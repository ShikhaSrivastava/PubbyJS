linked-data-browser
===================

Linked Data Browser aka PubbyJS

Linked Data Browser

To execute the program:
1) Open a terminal and come till LinkedDataBrowser i.e /path/to/LinkedDataBrowser
2) to execute run the command "node linkedApp.js" (minus the quotes)


To change the default properties you can edit the linkedBrowser.properties file

Once the server is running you can use a sample URL to execute it
http://localhost:3000/query?internalUri=http://dbpedia.org/resource/University_of_Southern_California&preferredLanguage=en&limit=10


The basic data structure for display is as follows.
There is one object that contains the information for a property and all the values.

- `uri`: The URI of the property.
- `label`: an array of alternative labesl for the property.
- `values`: an array of the values of the property, truncated to a max number of values.
    - `type`: indicates the type of the value
        - `internaluri`: specifies a URI to the same triple store where the original object came from.
        - `externaluri`: a URL to an external web site.
        - `literal`: a literal value.
    - `label`: an array of labels for `internaluris`, any could be used to show it.
    - `depiction`: an array of URLs containing images (the current code computes these incorrectly and includes bogus values for depictions.
    - `value`: the actual value.
  
Here is an example:
```
  {
    "uri": "http://dbpedia.org/property/timezoneDst",
    "label": [
      "timezone%20DST"
    ],
    "values": [
      {
        "type": "internaluri",
        "label": [
          "Pacific%20Time%20Zone"
        ],
        "depiction": [
          "http%3A//upload.wikimedia.org/wikipedia/commons/7/73/Pst.PNG"
        ],
        "value": "http%3A//dbpedia.org/resource/Pacific_Time_Zone"
      }
    ]
  }
```

The current code is more complex than it needs to be. We were experimenting with using rdfstore to get the RDF from the triple store. It would be simpler to use SPARQL queries with accept JSON, build the data structure in memory, and render it with JADE.

It will be necessary to do several SPARQL queries:

1. Retrieve the triples for the base object.
2. Retrieve the labels.
3. Retrieve the depictions.

Several queries are necessary to avoid cross products in the result set. The current implementation uses a single CONSTRUCT query, so it needs to put the results in the local rdfstore. Some experimentation is needed to determine whether the CONSTRUCT query is much more efficient. In that case it would be possible to use the rdfstore and rewrite the 3 SPARQL queries to go to the local triple store.

The current code builds the JSON as a string, which is very strange as it would be simpler to build the object in memory.
