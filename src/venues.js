/* =====================================================================
   PUTT LEAGUE · VENUE REGISTRY
   Every venue registers itself here by id. A venue is split in two files that register into
   the same entry: `venues/<id>.js` (the model: layout, holes, surfaces, solids, lie bounds,
   trick reads; runs in Node for the tests) and `venues/<id>.scene.js` (three.js: the 3D build
   and the bonus glows; browser only). Course.use(id) makes one the live venue.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Venues = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const list = [], byId = {};
  // registering an id twice merges the parts (the model file, then its scene file)
  function register(v) {
    if (!v || !v.id) throw new Error('a venue needs an id');
    if (byId[v.id]) Object.assign(byId[v.id], v);
    else { byId[v.id] = v; list.push(v); }
    return byId[v.id];
  }
  function get(id) {
    const v = id ? byId[id] : list[0];
    if (!v) throw new Error('no venue "' + id + '" (have: ' + list.map(x => x.id).join(', ') + ')');
    return v;
  }
  return { register, get, list: () => list.slice(), ids: () => list.map(v => v.id) };
});
