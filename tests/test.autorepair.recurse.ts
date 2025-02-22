import {afterEach, describe, expect, it, vi} from "vitest";
import ide from "../js/ide";

describe("ide.autorepair.recurse", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  // autocomplete missing recurse statements: xml query
  it("autocomplete xml query", () => {
    const examples = [
      {
        // trivial case
        inp: "<print/>",
        outp:
          '\n<!-- added by auto repair -->\n<union>\n  <item/>\n  <recurse type="down"/>\n</union>\n<!-- end of auto repair --><print/>'
      },
      {
        // simple real life example
        inp:
          '<osm-script output="json">\n  <query type="way">\n    <has-kv k="name"/>\n    <bbox-query {{bbox}}/>\n  </query>\n  <print mode="body" order="quadtile"/>\n</osm-script>',
        outp:
          '<osm-script output="json">\n  <query type="way">\n    <has-kv k="name"/>\n    <bbox-query {{bbox}}/>\n  </query>\n  <!-- added by auto repair -->\n  <union>\n    <item/>\n    <recurse type="down"/>\n  </union>\n  <!-- end of auto repair -->\n  <print mode="body" order="quadtile"/>\n</osm-script>'
      },
      {
        // complex example with multiple prints and named input sets
        inp:
          '<query type="way" into="foo">\n  <has-kv k="amenity"/>\n  <bbox-query {{bbox}}/>\n</query>\n<query type="way" into="bar">\n  <has-kv k="building"/>\n  <bbox-query {{bbox}}/>\n</query>\n<print from="foo"/>\n<print from="bar" mode="meta"/>',
        outp:
          '<query type="way" into="foo">\n  <has-kv k="amenity"/>\n  <bbox-query {{bbox}}/>\n</query>\n<query type="way" into="bar">\n  <has-kv k="building"/>\n  <bbox-query {{bbox}}/>\n</query>\n<!-- added by auto repair -->\n<union into="foo">\n  <item set="foo"/>\n  <recurse from="foo" type="down"/>\n</union>\n<!-- end of auto repair -->\n<print from="foo"/>\n<!-- added by auto repair -->\n<union into="bar">\n  <item set="bar"/>\n  <recurse from="bar" type="down"/>\n</union>\n<!-- end of auto repair -->\n<print from="bar" mode="meta"/>'
      }
    ];
    vi.spyOn(ide, "getQueryLang").mockImplementation(() => "xml");
    for (const example of examples) {
      const setQuery = vi.spyOn(ide, "setQuery").mockImplementation(() => {});
      vi.spyOn(ide, "getRawQuery").mockImplementation(() => example.inp);
      ide.repairQuery("no visible data");
      expect(setQuery).toHaveBeenCalledWith(example.outp);
    }
  });

  // autocomplete missing recurse statements: OverpassQL query
  it("autocomplete OverpassQL query", () => {
    const examples = [
      {
        // trivial case
        inp: "out;",
        outp: "/*added by auto repair*/(._;>;);/*end of auto repair*/out;"
      },
      {
        // simple real life example
        inp:
          '/*This is the drinking water example in OverpassQL.*/\n(\n  way["name"]({{bbox}})\n);\nout;',
        outp:
          '/*This is the drinking water example in OverpassQL.*/\n(\n  way["name"]({{bbox}})\n);\n/*added by auto repair*/\n(._;>;);\n/*end of auto repair*/\nout;'
      },
      {
        // simple query with coordinates
        inp:
          '(way["name"](50.75267740365953,7.085511088371277,50.755728421888925,7.0877212285995475));out;',
        outp:
          '(way["name"](50.75267740365953,7.085511088371277,50.755728421888925,7.0877212285995475));/*added by auto repair*/(._;>;);/*end of auto repair*/out;'
      },
      {
        // complex example with multiple prints and named input sets
        inp:
          'way\n  ["amenity"]\n  ({{bbox}})\n->.foo;\nway\n  ["building"]\n  ({{bbox}})\n->.bar;\n.foo out;\n.bar out meta;',
        outp:
          'way\n  ["amenity"]\n  ({{bbox}})\n->.foo;\nway\n  ["building"]\n  ({{bbox}})\n->.bar;\n/*added by auto repair*/\n(.foo;.foo >;)->.foo;\n/*end of auto repair*/\n.foo out;\n/*added by auto repair*/\n(.bar;.bar >;)->.bar;\n/*end of auto repair*/\n.bar out meta;'
      },
      {
        // example with the term "...out..." in string parameters
        inp: 'way({{bbox}})[junction=roundabout][name!="out"];out;',
        outp:
          'way({{bbox}})[junction=roundabout][name!="out"];/*added by auto repair*/(._;>;);/*end of auto repair*/out;'
      }
    ];
    vi.spyOn(ide, "getQueryLang").mockImplementation(() => "OverpassQL");
    for (const example of examples) {
      const setQuery = vi.spyOn(ide, "setQuery").mockImplementation(() => {});
      vi.spyOn(ide, "getRawQuery").mockImplementation(() => example.inp);
      ide.repairQuery("no visible data");
      expect(setQuery).toHaveBeenCalledWith(example.outp);
    }
  });

  // do not autocomplete in comments (xml query)
  it("do not autocomplete in comments (xml query)", () => {
    const examples = [
      {
        inp: "<!--<print/>-->",
        outp: "<!--<print/>-->"
      }
    ];
    vi.spyOn(ide, "getQueryLang").mockImplementation(() => "xml");
    for (const example of examples) {
      const setQuery = vi.spyOn(ide, "setQuery").mockImplementation(() => {});
      vi.spyOn(ide, "getRawQuery").mockImplementation(() => example.inp);
      ide.repairQuery("no visible data");
      expect(setQuery).toHaveBeenCalledWith(example.outp);
    }
  });

  // do not autocomplete in comments (OverpassQL query)
  it("do not autocomplete in comments (OverpassQL query)", () => {
    const examples = [
      {
        // multiline comments
        inp: "/*out;*/",
        outp: "/*out;*/"
      },
      {
        // single line comments
        inp: "//out;\n",
        outp: "//out;\n"
      }
    ];
    vi.spyOn(ide, "getQueryLang").mockImplementation(() => "xml");
    for (const example of examples) {
      const setQuery = vi.spyOn(ide, "setQuery").mockImplementation(() => {});
      vi.spyOn(ide, "getRawQuery").mockImplementation(() => example.inp);
      ide.repairQuery("no visible data");
      expect(setQuery).toHaveBeenCalledWith(example.outp);
    }
  });
});
