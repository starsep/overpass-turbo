import evalparser from "./eval.pegjs";

const styleparser = {};
styleparser.Style = function () {
  this.__init__();
};

styleparser.Style.prototype = {
  merged: false,
  edited: false,
  //sublayer: 5, // TODO: commented out. see RuleSet.js
  //interactive: true, // TODO: commented out. see RuleSet.js
  properties: [],
  styleType: "Style",
  evals: null,

  __init__() {
    this.evals = {};
  },

  drawn() {
    return false;
  },

  has(k) {
    return this.properties.indexOf(k) > -1;
  },

  mergeWith(additional) {
    for (const prop in this.properties) {
      if (additional[prop]) {
        this[prop] = additional[prop];
      }
    }
    this.merged = true;
  },

  setPropertyFromString(k, v, isEval) {
    this.edited = true;
    if (isEval) {
      this.evals[k] = v;
      return;
    }

    if (typeof this[k] == "boolean") {
      v = Boolean(v);
    } else if (typeof this[k] == "number") {
      v = Number(v);
    } else if (this[k] && this[k].constructor == Array) {
      v = v.split(",").map((a) => Number(a));
    }
    this[k] = v;
    return true;
  },

  runEvals(tags) {
    // helper object for eval() properties
    for (const k in this.evals) {
      try {
        window.osm_tag = function (t) {
          return tags[t] || "";
        };
        this.setPropertyFromString(k, evalparser.parse(this.evals[k]));
      } catch (e) {
        console.error("Error while evaluating mapcss evals", e);
      }
    }
  },

  toString() {
    let str = "";
    for (const k in this.properties) {
      // eslint-disable-next-line no-prototype-builtins
      if (this.hasOwnProperty(k)) {
        str += `${k}=${this[k]}; `;
      }
    }
    return str;
  }
};
styleparser.inherit_from_Style = function (target) {
  for (const p in styleparser.Style.prototype)
    if (target[p] === undefined) target[p] = styleparser.Style.prototype[p];
};

// ----------------------------------------------------------------------
// InstructionStyle class

styleparser.InstructionStyle = function () {
  this.__init__();
};
styleparser.InstructionStyle.prototype = {
  set_tags: null,
  breaker: false,
  styleType: "InstructionStyle",

  __init__() {},

  addSetTag(k, v) {
    this.edited = true;
    if (!this.set_tags) this.set_tags = {};
    this.set_tags[k] = v;
  }
};
styleparser.inherit_from_Style(styleparser.InstructionStyle.prototype);

// ----------------------------------------------------------------------
// PointStyle class

styleparser.PointStyle = function () {
  this.__init__();
};
styleparser.PointStyle.prototype = {
  properties: [
    "icon_image",
    "icon_width",
    "icon_height",
    "icon_opacity",
    "rotation"
  ],
  icon_image: null,
  icon_width: 0,
  icon_height: NaN,
  rotation: NaN,
  styleType: "PointStyle",

  drawn() {
    return this.icon_image !== null;
  },

  maxwidth() {
    return this.evals.icon_width ? 0 : this.icon_width;
  }
};
styleparser.inherit_from_Style(styleparser.PointStyle.prototype);

// ----------------------------------------------------------------------
// ShapeStyle class

styleparser.ShapeStyle = function () {
  this.__init__();
};

styleparser.ShapeStyle.prototype = {
  properties: [
    "width",
    "offset",
    "color",
    "opacity",
    "dashes",
    "linecap",
    "linejoin",
    "line_style",
    "fill_image",
    "fill_color",
    "fill_opacity",
    "casing_width",
    "casing_color",
    "casing_opacity",
    "casing_dashes",
    "layer"
  ],

  width: 0,
  color: null,
  opacity: NaN,
  dashes: [],
  linecap: null,
  linejoin: null,
  line_style: null,
  fill_image: null,
  fill_color: null,
  fill_opacity: NaN,
  casing_width: NaN,
  casing_color: null,
  casing_opacity: NaN,
  casing_dashes: [],
  layer: NaN, // optional layer override (usually set by OSM tag)
  styleType: "ShapeStyle",

  drawn() {
    return (
      this.fill_image ||
      !isNaN(this.fill_color) ||
      this.width ||
      this.casing_width
    );
  },
  maxwidth() {
    // If width is set by an eval, then we can't use it to calculate maxwidth, or it'll just grow on each invocation...
    if (this.evals.width || this.evals.casing_width) {
      return 0;
    }
    return this.width + (this.casing_width ? this.casing_width * 2 : 0);
  },
  strokeStyler() {
    let cap, join;
    switch (this.linecap) {
      case "round":
        cap = "round";
        break;
      case "square":
        cap = "square";
        break;
      default:
        cap = "butt";
        break;
    }
    switch (this.linejoin) {
      case "bevel":
        join = "bevel";
        break;
      case "miter":
        join = 4;
        break;
      default:
        join = "round";
        break;
    }
    return {
      color: this.dojoColor(
        this.color ? this.color : 0,
        this.opacity ? this.opacity : 1
      ),
      style: "Solid", // needs to parse dashes
      width: this.width,
      cap: cap,
      join: join
    };
  },
  shapeStrokeStyler() {
    if (isNaN(this.casing_color)) {
      return {width: 0};
    }
    return {
      color: this.dojoColor(
        this.casing_color,
        this.casing_opacity ? this.casing_opacity : 1
      ),
      width: this.casing_width ? this.casing_width : 1
    };
  },
  shapeFillStyler() {
    if (isNaN(this.color)) {
      return null;
    }
    return this.dojoColor(this.color, this.opacity ? this.opacity : 1);
  },
  fillStyler() {
    return this.dojoColor(
      this.fill_color,
      this.fill_opacity ? this.fill_opacity : 1
    );
  },
  casingStyler() {
    let cap, join;
    switch (this.linecap) {
      case "round":
        cap = "round";
        break;
      case "square":
        cap = "square";
        break;
      default:
        cap = "butt";
        break;
    }
    switch (this.linejoin) {
      case "bevel":
        join = "bevel";
        break;
      case "miter":
        join = 4;
        break;
      default:
        join = "round";
        break;
    }
    return {
      color: this.dojoColor(
        this.casing_color ? this.casing_color : 0,
        this.casing_opacity ? this.casing_opacity : 1
      ),
      width: this.width + this.casing_width * 2,
      style: "Solid",
      cap: cap,
      join: join
    };
  }
};
styleparser.inherit_from_Style(styleparser.ShapeStyle.prototype);

// ----------------------------------------------------------------------
// TextStyle class

styleparser.TextStyle = function () {
  this.__init__();
};
styleparser.TextStyle.prototype = {
  properties: [
    "font_family",
    "font_bold",
    "font_italic",
    "font_caps",
    "font_underline",
    "font_size",
    "text_color",
    "text_offset",
    "max_width",
    "text",
    "text_halo_color",
    "text_halo_radius",
    "text_center",
    "letter_spacing"
  ],
  // TODO: font_bold??? wtf? -> support propper MapCSS properites!

  font_family: null,
  font_bold: false,
  font_italic: false,
  font_underline: false,
  font_caps: false,
  font_size: NaN,
  text_color: null,
  text_offset: NaN,
  max_width: NaN,
  text: null,
  text_halo_color: null,
  text_halo_radius: 0,
  text_center: true,
  letter_spacing: 0,
  styleType: "TextStyle",

  fontStyler() {
    return {
      family: this.font_family ? this.font_family : "Arial",
      size: this.font_size ? this.font_size * 2 : "10px",
      weight: this.font_bold ? "bold" : "normal",
      style: this.font_italic ? "italic" : "normal"
    };
  },
  textStyler(_text) {
    return {
      decoration: this.font_underline ? "underline" : "none",
      align: "middle",
      text: _text
    };
  },
  fillStyler() {
    // not implemented yet
    return this.dojoColor(0, 1);
  }

  // getTextFormat, getHaloFilter, writeNameLabel
};
styleparser.inherit_from_Style(styleparser.TextStyle.prototype);

// ----------------------------------------------------------------------
// ShieldStyle class

styleparser.ShieldStyle = function () {
  this.__init__();
};

styleparser.ShieldStyle.prototype = {
  has(k) {
    return this.properties.indexOf(k) > -1;
  },
  properties: ["shield_image", "shield_width", "shield_height"],
  shield_image: null,
  shield_width: NaN,
  shield_height: NaN,
  styleType: "ShieldStyle"
};
styleparser.inherit_from_Style(styleparser.ShieldStyle.prototype);

// ----------------------------------------------------------------------
// End of module

export default styleparser;
