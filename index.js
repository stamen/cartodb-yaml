"use strict";

var assert = require("assert"),
    fs = require("fs"),
    path = require("path"),
    util = require("util");

var yaml = require("js-yaml");

module.exports = function compile(project, options) {
  options = options || {};
  options.path = options.path || process.cwd();
  options.layerCatalog = options.layerCatalog ||
    yaml.safeLoad(fs.readFileSync(path.join(options.path, "layers.yml")));

  project = yaml.safeLoad(project);

  if (!(project.name && Array.isArray(project.layers))) {
    return {};
  }

  var layers = project.layers.map(function(layer) {
    var name = Object.keys(layer)[0],
        layerDef = options.layerCatalog[name] || {},
        localDef = layer[name] && typeof layer[name] === "object" ? layer[name] : {},
        cartoCssFile = localDef.cartocss_file || layer[name] || layerDef.cartocss_file || util.format("styles/%s.mss", name);

    assert.ok(Object.keys(localDef).length || Object.keys(layerDef).length, util.format("Could not find a layer definition for '%s'.", name));

    var layerOptions = {
      type: localDef.type || layerDef.type || "mapnik",
      options: {}
    };

    if (["mapnik", "cartodb", "torque"].indexOf(layerOptions.type) >= 0) {
      layerOptions.options = {
        sql: localDef.sql || layerDef.sql,
        cartocss: fs.readFileSync(path.join(options.path, cartoCssFile), "utf8"),
        cartocss_version: localDef.cartocss_version || layerDef.cartocss_version || "2.1.1"
      };
    }

    [
      "geom_column", "geom_type", "raster_band", "srid", // Mapnik
      "step", // Torque
      "urlTemplate", "tms" // HTTP
    ].forEach(function(k) {
      if (localDef[k] || layerDef[k]) {
        layerOptions.options[k] = localDef[k] || layerDef[k];
      }
    });

    ["affected_tables", "interactivity"].forEach(function(k) {
      // assign the layer localDef first
      if (Array.isArray(layerDef[k])) {
        layerOptions.options[k] = layerDef[k];
      }

      // override if a local localDef is available
      if (Array.isArray(localDef[k])) {
        layerOptions.options[k] = localDef[k];
      }
    });

    if (typeof layerDef.attributes === "object") {
      layerOptions.attributes = layerDef.attributes;
    }

    if (typeof localDef.attributes === "object") {
      layerOptions.attributes = localDef.attributes;
    }

    return layerOptions;
  });

  var namedMap = {
    name: project.name,
    version: "0.0.1", // https://github.com/CartoDB/Windshaft-cartodb/blob/master/docs/Template-maps.md
    layergroup: {
      version: "1.3.0", // https://github.com/CartoDB/Windshaft/blob/master/doc/MapConfig-1.3.0.md
      layers: layers
    }
  }

  if (Array.isArray(project.extent)) {
    namedMap.layergroup.extent = project.extent;
  }

  if (project.srid) {
    namedMap.layergroup.srid = project.srid;
  }

  if (project.minzoom != null) {
    namedMap.layergroup.minzoom = project.minzoom;
  }

  if (project.maxzoom != null) {
    namedMap.layergroup.maxzoom = project.maxzoom;
  }

  if (project.placeholders) {
    namedMap.placeholders = project.placeholders
  }

  return namedMap;
};
