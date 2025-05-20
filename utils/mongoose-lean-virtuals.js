/**
 * mongoose-lean-virtuals.js
 * 
 * This plugin adds support for including virtuals in lean query results.
 * When using .lean() for better performance, virtuals are normally excluded.
 * This plugin allows using virtuals even with lean queries.
 */

module.exports = function mongooseLeanVirtuals(schema) {
  // Add post hook for find queries
  schema.post('find', attachVirtuals);
  schema.post('findOne', attachVirtuals);
  schema.post('findOneAndUpdate', attachVirtuals);
  schema.post('aggregate', attachVirtualsToAggregate);

  // The function that attaches virtuals to the result
  function attachVirtuals(res) {
    if (res == null || !this._mongooseOptions || !this._mongooseOptions.lean) {
      return;
    }

    // Check if lean option includes virtuals
    const virtuals = this._mongooseOptions.lean.virtuals;
    if (!virtuals) {
      return;
    }

    const virtualKeys = Object.keys(schema.virtuals);
    if (!virtualKeys.length) {
      return;
    }

    // Handle array results
    if (Array.isArray(res)) {
      const len = res.length;
      for (let i = 0; i < len; ++i) {
        attachVirtualsToDoc(res[i], virtualKeys, schema);
      }
      return;
    }

    // Handle single document
    attachVirtualsToDoc(res, virtualKeys, schema);
  }

  // Function to attach virtuals to aggregation results
  function attachVirtualsToAggregate(res) {
    if (res == null || !Array.isArray(res)) {
      return;
    }

    // Check if lean option includes virtuals in pipeline options
    const virtuals = this.options?.lean?.virtuals;
    if (!virtuals) {
      return;
    }

    const virtualKeys = Object.keys(schema.virtuals);
    if (!virtualKeys.length) {
      return;
    }

    // Handle array results from aggregation
    const len = res.length;
    for (let i = 0; i < len; ++i) {
      attachVirtualsToDoc(res[i], virtualKeys, schema);
    }
  }

  // Helper function to attach virtuals to a single document
  function attachVirtualsToDoc(doc, virtualKeys, schema) {
    if (doc == null) {
      return;
    }

    for (const key of virtualKeys) {
      // Skip virtuals with transform functions
      if (schema.virtuals[key].getters.length === 0) {
        continue;
      }

      // Skip already defined properties
      if (doc[key] !== undefined) {
        continue;
      }

      // Create a fake document to calculate the virtual
      const virtualDoc = {};
      for (const prop in doc) {
        virtualDoc[prop] = doc[prop];
      }
      
      // Create a getter for the virtual
      Object.defineProperty(virtualDoc, key, {
        get: function() {
          return schema.virtuals[key].applyGetters(undefined, this);
        },
        enumerable: true
      });

      // Attach the virtual value to the result document
      doc[key] = virtualDoc[key];
    }
  }
};