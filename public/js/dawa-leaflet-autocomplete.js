"use strict"

var autocomplete = require('autocomplete.js')
  , dawautil = require('dawa-util');

var host= "https://dawa.aws.dk/"; 
let miljø= getQueryVariable('m');
if (miljø) {
  host= host.replace('dawa',miljø); 
} 

function getQueryVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i=0; i<vars.length; i++) {
    var pair = vars[i].split("=");
    if (pair[0] == variable) {
      return pair[1];
    }
  }
}

function visnavngivenvej(map, stednavn) {
  fetch(host+"steder/"+stednavn.sted.id + '?format=geojson').then( function(response) {
    response.json().then( function ( data ) {

      if (data.geometri || data.features && data.features.length === 0) {
            alert('Søgning gav intet resultat');
            return;
          }
      var geojsonlayer= L.geoJSON(data);
      geojsonlayer.addTo(map);

      map.fitBounds(geojsonlayer.getBounds());

      var x= stednavn.sted.visueltcenter[1]
        , y= stednavn.sted.visueltcenter[0];
      var popup = L.popup()
        .setLatLng([x, y])
        .setContent("<a target='_blank' href='" + host + "steder/"+stednavn.sted.id+"'>" + stednavn.navn + '<br/>' + stednavn.sted.hovedtype + ', ' + stednavn.sted.undertype + "</a>")
        .openOn(map);
      geojsonlayer.bindPopup(popup);
      // var x= adgangsadresse.adgangspunkt.koordinater[1]
      //   , y= adgangsadresse.adgangspunkt.koordinater[0];
      // var marker= L.circleMarker(L.latLng(x, y), {color: 'red', fillColor: 'red', stroke: true, fillOpacity: 1.0, radius: 4, weight: 2, opacity: 1.0}).addTo(map);//defaultpointstyle);
      // var popup= marker.bindPopup(L.popup().setContent("<a target='_blank' href='https://dawa.aws.dk/adgangsadresser?id="+adgangsadresse.id+"'>" + dawautil.formatAdgangsadresse(adgangsadresse) + "</a>"),{autoPan: true});
      // if (adgangsadresse.vejpunkt) {
      //   var vx= adgangsadresse.vejpunkt.koordinater[1]
      //     , vy= adgangsadresse.vejpunkt.koordinater[0];
      //   var vpmarker= L.circleMarker(L.latLng(vx, vy), {color: 'blue', fillColor: 'blue', stroke: true, fillOpacity: 1.0, radius: 4, weight: 2, opacity: 1.0}).addTo(map);//defaultpointstyle);
      //   vpmarker.bindPopup(L.popup().setContent("<a target='_blank' href='https://dawa.aws.dk/adgangsadresser?id="+adgangsadresse.id+"'>" + dawautil.formatAdgangsadresse(adgangsadresse) + "</a>"),{autoPan: true});
      // }
      // map.setView(L.latLng(x, y),12);
      //popup.openPopup();
    });
  });
}

function search(query, callback) {
  fetch(host + "vejstykker/autocomplete?fuzzy&q="+query+"*")
  .catch(function (error) {
    alert(error.message);
    callback([]);
  })
  .then(function(response) {
    if (response.status >=400 && response.status <= 499) {
      response.json().then(function (object) {
        alert(object.type + ': ' + object.title);
      });            
      callback([]);
    }
    else if (response.status >= 200 && response.status <=299 ){
      return response.json();
    }
  }) 
  .then( function ( stednavne ) { 
    callback(stednavne);
  });
}

L.Control.Search = L.Control.extend({
  options: {
    // topright, topleft, bottomleft, bottomright
    position: 'topright',
    placeholder: 'vejnavn'
   // selected: selected
  },
  initialize: function (options /*{ data: {...}  }*/) {
    // constructor
    L.Util.setOptions(this, options);
  },
  onAdd: function (map) {
    // happens after added to map
    var container = L.DomUtil.create('div', '');
    this.form = L.DomUtil.create('form', '', container);
    var group = L.DomUtil.create('div', '', this.form);
    this.input = L.DomUtil.create('input', 'searchbox', group);
    this.input.type = 'search';
    this.input.placeholder = this.options.placeholder;
    autocomplete(this.input, { debug: true, hint: false, templates: { empty: 'empty' }, autoselect: true }, [
        {
          source: search,
          displayKey: 'navn',
          templates: {
            suggestion: function(suggestion) {
              return '<div>' + suggestion.tekst + " (" + suggestion.vejstykke.kommunekode + ')' + '</div>';
            }
          }
        }
      ]).on('autocomplete:selected', function(even, suggestion, dataset) {
        console.log('selected', suggestion, dataset);
        visnavngivenvej(map, suggestion);
      }).on('autocomplete:cursorchanged', function(even, suggestion, dataset) {
        console.log('cursorchanged', suggestion, dataset);
      });
    L.DomEvent.disableClickPropagation(container);
    return container;
  },
  onRemove: function (map) {
    // when removed
    L.DomEvent.removeListener(form, 'submit', this.submit, this);
  },
  submit: function(e) {
    L.DomEvent.preventDefault(e);
  }
});

exports.search = function(id, options) {
  return new L.Control.Search(id, options);
}