"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeGeotiff = void 0;
/*
  Some parts of this file are based on UTIF.js,
  which was released under the MIT License.
  You can view that here:
  https://github.com/photopea/UTIF.js/blob/master/LICENSE
*/
const globals_js_1 = require("./globals.js");
const utils_js_1 = require("./utils.js");
const tagName2Code = (0, utils_js_1.invert)(globals_js_1.fieldTagNames);
const geoKeyName2Code = (0, utils_js_1.invert)(globals_js_1.geoKeyNames);
const name2code = {};
(0, utils_js_1.assign)(name2code, tagName2Code);
(0, utils_js_1.assign)(name2code, geoKeyName2Code);
const typeName2byte = (0, utils_js_1.invert)(globals_js_1.fieldTypeNames);
// config variables
const numBytesInIfd = 1000;
const _binBE = {
    nextZero: (data, o) => {
        let oincr = o;
        while (data[oincr] !== 0) {
            oincr++;
        }
        return oincr;
    },
    readUshort: (buff, p) => {
        return (buff[p] << 8) | buff[p + 1];
    },
    readShort: (buff, p) => {
        const a = _binBE.ui8;
        a[0] = buff[p + 1];
        a[1] = buff[p + 0];
        return _binBE.i16[0];
    },
    readInt: (buff, p) => {
        const a = _binBE.ui8;
        a[0] = buff[p + 3];
        a[1] = buff[p + 2];
        a[2] = buff[p + 1];
        a[3] = buff[p + 0];
        return _binBE.i32[0];
    },
    readUint: (buff, p) => {
        const a = _binBE.ui8;
        a[0] = buff[p + 3];
        a[1] = buff[p + 2];
        a[2] = buff[p + 1];
        a[3] = buff[p + 0];
        return _binBE.ui32[0];
    },
    readASCII: (buff, p, l) => {
        return l.map((i) => String.fromCharCode(buff[p + i])).join('');
    },
    readFloat: (buff, p) => {
        const a = _binBE.ui8;
        (0, utils_js_1.times)(4, (i) => {
            a[i] = buff[p + 3 - i];
        });
        return _binBE.fl32[0];
    },
    readDouble: (buff, p) => {
        const a = _binBE.ui8;
        (0, utils_js_1.times)(8, (i) => {
            a[i] = buff[p + 7 - i];
        });
        return _binBE.fl64[0];
    },
    writeUshort: (buff, p, n) => {
        buff[p] = (n >> 8) & 255;
        buff[p + 1] = n & 255;
    },
    writeUint: (buff, p, n) => {
        buff[p] = (n >> 24) & 255;
        buff[p + 1] = (n >> 16) & 255;
        buff[p + 2] = (n >> 8) & 255;
        buff[p + 3] = (n >> 0) & 255;
    },
    writeASCII: (buff, p, s) => {
        (0, utils_js_1.times)(s.length, (i) => {
            buff[p + i] = s.charCodeAt(i);
        });
    },
    ui8: new Uint8Array(8),
};
_binBE.fl64 = new Float64Array(_binBE.ui8.buffer);
_binBE.writeDouble = (buff, p, n) => {
    _binBE.fl64[0] = n;
    (0, utils_js_1.times)(8, (i) => {
        buff[p + i] = _binBE.ui8[7 - i];
    });
};
const _writeIFD = (bin, data, _offset, ifd) => {
    let offset = _offset;
    const keys = Object.keys(ifd).filter((key) => {
        return key !== undefined && key !== null && key !== 'undefined';
    });
    bin.writeUshort(data, offset, keys.length);
    offset += 2;
    let eoff = offset + (12 * keys.length) + 4;
    for (const key of keys) {
        let tag = null;
        if (typeof key === 'number') {
            tag = key;
        }
        else if (typeof key === 'string') {
            tag = parseInt(key, 10);
        }
        const typeName = globals_js_1.fieldTagTypes[tag];
        const typeNum = typeName2byte[typeName];
        if (typeName == null || typeName === undefined || typeof typeName === 'undefined') {
            throw new Error(`unknown type of tag: ${tag}`);
        }
        let val = ifd[key];
        if (val === undefined) {
            throw new Error(`failed to get value for key ${key}`);
        }
        // ASCIIZ format with trailing 0 character
        // http://www.fileformat.info/format/tiff/corion.htm
        // https://stackoverflow.com/questions/7783044/whats-the-difference-between-asciiz-vs-ascii
        if (typeName === 'ASCII' && typeof val === 'string' && (0, utils_js_1.endsWith)(val, '\u0000') === false) {
            val += '\u0000';
        }
        const num = val.length;
        bin.writeUshort(data, offset, tag);
        offset += 2;
        bin.writeUshort(data, offset, typeNum);
        offset += 2;
        bin.writeUint(data, offset, num);
        offset += 4;
        let dlen = [-1, 1, 1, 2, 4, 8, 0, 0, 0, 0, 0, 0, 8][typeNum] * num;
        let toff = offset;
        if (dlen > 4) {
            bin.writeUint(data, offset, eoff);
            toff = eoff;
        }
        if (typeName === 'ASCII') {
            bin.writeASCII(data, toff, val);
        }
        else if (typeName === 'SHORT') {
            (0, utils_js_1.times)(num, (i) => {
                bin.writeUshort(data, toff + (2 * i), val[i]);
            });
        }
        else if (typeName === 'LONG') {
            (0, utils_js_1.times)(num, (i) => {
                bin.writeUint(data, toff + (4 * i), val[i]);
            });
        }
        else if (typeName === 'RATIONAL') {
            (0, utils_js_1.times)(num, (i) => {
                bin.writeUint(data, toff + (8 * i), Math.round(val[i] * 10000));
                bin.writeUint(data, toff + (8 * i) + 4, 10000);
            });
        }
        else if (typeName === 'DOUBLE') {
            (0, utils_js_1.times)(num, (i) => {
                bin.writeDouble(data, toff + (8 * i), val[i]);
            });
        }
        if (dlen > 4) {
            dlen += (dlen & 1);
            eoff += dlen;
        }
        offset += 4;
    }
    return [offset, eoff];
};
const encodeIfds = (ifds) => {
    const data = new Uint8Array(numBytesInIfd);
    let offset = 4;
    const bin = _binBE;
    // set big-endian byte-order
    // https://en.wikipedia.org/wiki/TIFF#Byte_order
    data[0] = 77;
    data[1] = 77;
    // set format-version number
    // https://en.wikipedia.org/wiki/TIFF#Byte_order
    data[3] = 42;
    let ifdo = 8;
    bin.writeUint(data, offset, ifdo);
    offset += 4;
    ifds.forEach((ifd, i) => {
        const noffs = _writeIFD(bin, data, ifdo, ifd);
        ifdo = noffs[1];
        if (i < ifds.length - 1) {
            bin.writeUint(data, noffs[0], ifdo);
        }
    });
    if (data.slice) {
        return data.slice(0, ifdo).buffer;
    }
    // node hasn't implemented slice on Uint8Array yet
    const result = new Uint8Array(ifdo);
    for (let i = 0; i < ifdo; i++) {
        result[i] = data[i];
    }
    return result.buffer;
};
const encodeImage = (values, width, height, metadata) => {
    if (height === undefined || height === null) {
        throw new Error(`you passed into encodeImage a width of type ${height}`);
    }
    if (width === undefined || width === null) {
        throw new Error(`you passed into encodeImage a width of type ${width}`);
    }
    const ifd = {
        256: [width],
        257: [height],
        273: [numBytesInIfd],
        278: [height],
        305: 'geotiff.js', // no array for ASCII(Z)
    };
    if (metadata) {
        for (const i in metadata) {
            if (metadata.hasOwnProperty(i)) {
                ifd[i] = metadata[i];
            }
        }
    }
    const prfx = new Uint8Array(encodeIfds([ifd]));
    const samplesPerPixel = ifd[globals_js_1.fieldTags.SamplesPerPixel];
    const dataType = values.constructor.name;
    const TypedArray = utils_js_1.typeMap[dataType];
    // default for Float64
    let elementSize = 8;
    if (TypedArray) {
        elementSize = TypedArray.BYTES_PER_ELEMENT;
    }
    const data = new Uint8Array(numBytesInIfd + (values.length * elementSize * samplesPerPixel));
    (0, utils_js_1.times)(prfx.length, (i) => {
        data[i] = prfx[i];
    });
    (0, utils_js_1.forEach)(values, (value, i) => {
        if (!TypedArray) {
            data[numBytesInIfd + i] = value;
            return;
        }
        const buffer = new ArrayBuffer(elementSize);
        const view = new DataView(buffer);
        if (dataType === 'Float64Array') {
            view.setFloat64(0, value, false);
        }
        else if (dataType === 'Float32Array') {
            view.setFloat32(0, value, false);
        }
        else if (dataType === 'Uint32Array') {
            view.setUint32(0, value, false);
        }
        else if (dataType === 'Uint16Array') {
            view.setUint16(0, value, false);
        }
        else if (dataType === 'Uint8Array') {
            view.setUint8(0, value);
        }
        const typedArray = new Uint8Array(view.buffer);
        const idx = numBytesInIfd + (i * elementSize);
        for (let j = 0; j < elementSize; j++) {
            data[idx + j] = typedArray[j];
        }
    });
    return data.buffer;
};
const convertToTids = (input) => {
    const result = {};
    for (const key in input) {
        if (key !== 'StripOffsets') {
            if (!name2code[key]) {
                console.error(key, 'not in name2code:', Object.keys(name2code));
            }
            result[name2code[key]] = input[key];
        }
    }
    return result;
};
const toArray = (input) => {
    if (Array.isArray(input)) {
        return input;
    }
    return [input];
};
const metadataDefaults = [
    ['Compression', 1],
    ['PlanarConfiguration', 1],
    ['ExtraSamples', 0],
];
function writeGeotiff(data, metadata) {
    const isFlattened = typeof data[0] === 'number';
    let height;
    let numBands;
    let width;
    let flattenedValues;
    if (isFlattened) {
        height = metadata.height || metadata.ImageLength;
        width = metadata.width || metadata.ImageWidth;
        numBands = data.length / (height * width);
        flattenedValues = data;
    }
    else {
        numBands = data.length;
        height = data[0].length;
        width = data[0][0].length;
        flattenedValues = [];
        (0, utils_js_1.times)(height, (rowIndex) => {
            (0, utils_js_1.times)(width, (columnIndex) => {
                (0, utils_js_1.times)(numBands, (bandIndex) => {
                    flattenedValues.push(data[bandIndex][rowIndex][columnIndex]);
                });
            });
        });
    }
    metadata.ImageLength = height;
    delete metadata.height;
    metadata.ImageWidth = width;
    delete metadata.width;
    // consult https://www.loc.gov/preservation/digital/formats/content/tiff_tags.shtml
    if (!metadata.BitsPerSample) {
        let bitsPerSample = 8;
        if (ArrayBuffer.isView(flattenedValues)) {
            bitsPerSample = 8 * flattenedValues.BYTES_PER_ELEMENT;
        }
        metadata.BitsPerSample = (0, utils_js_1.times)(numBands, () => bitsPerSample);
    }
    metadataDefaults.forEach((tag) => {
        const key = tag[0];
        if (!metadata[key]) {
            const value = tag[1];
            metadata[key] = value;
        }
    });
    // The color space of the image data.
    // 1=black is zero and 2=RGB.
    if (!metadata.PhotometricInterpretation) {
        metadata.PhotometricInterpretation = metadata.BitsPerSample.length === 3 ? 2 : 1;
    }
    // The number of components per pixel.
    if (!metadata.SamplesPerPixel) {
        metadata.SamplesPerPixel = [numBands];
    }
    if (!metadata.StripByteCounts) {
        // we are only writing one strip
        // default for Float64
        let elementSize = 8;
        if (ArrayBuffer.isView(flattenedValues)) {
            elementSize = flattenedValues.BYTES_PER_ELEMENT;
        }
        metadata.StripByteCounts = [numBands * elementSize * height * width];
    }
    if (!metadata.ModelPixelScale) {
        // assumes raster takes up exactly the whole globe
        metadata.ModelPixelScale = [360 / width, 180 / height, 0];
    }
    if (!metadata.SampleFormat) {
        let sampleFormat = 1;
        if ((0, utils_js_1.isTypedFloatArray)(flattenedValues)) {
            sampleFormat = 3;
        }
        if ((0, utils_js_1.isTypedIntArray)(flattenedValues)) {
            sampleFormat = 2;
        }
        if ((0, utils_js_1.isTypedUintArray)(flattenedValues)) {
            sampleFormat = 1;
        }
        metadata.SampleFormat = (0, utils_js_1.times)(numBands, () => sampleFormat);
    }
    // if didn't pass in projection information, assume the popular 4326 "geographic projection"
    if (!metadata.hasOwnProperty('GeographicTypeGeoKey') && !metadata.hasOwnProperty('ProjectedCSTypeGeoKey')) {
        metadata.GeographicTypeGeoKey = 4326;
        metadata.ModelTiepoint = [0, 0, 0, -180, 90, 0]; // raster fits whole globe
        metadata.GeogCitationGeoKey = 'WGS 84';
        metadata.GTModelTypeGeoKey = 2;
    }
    const geoKeys = Object.keys(metadata)
        .filter((key) => (0, utils_js_1.endsWith)(key, 'GeoKey'))
        .sort((a, b) => name2code[a] - name2code[b]);
    if (!metadata.GeoAsciiParams) {
        let geoAsciiParams = '';
        geoKeys.forEach((name) => {
            const code = Number(name2code[name]);
            const tagType = globals_js_1.fieldTagTypes[code];
            if (tagType === 'ASCII') {
                geoAsciiParams += `${metadata[name].toString()}\u0000`;
            }
        });
        if (geoAsciiParams.length > 0) {
            metadata.GeoAsciiParams = geoAsciiParams;
        }
    }
    if (!metadata.GeoKeyDirectory) {
        const NumberOfKeys = geoKeys.length;
        const GeoKeyDirectory = [1, 1, 0, NumberOfKeys];
        geoKeys.forEach((geoKey) => {
            const KeyID = Number(name2code[geoKey]);
            GeoKeyDirectory.push(KeyID);
            let Count;
            let TIFFTagLocation;
            let valueOffset;
            if (globals_js_1.fieldTagTypes[KeyID] === 'SHORT') {
                Count = 1;
                TIFFTagLocation = 0;
                valueOffset = metadata[geoKey];
            }
            else if (geoKey === 'GeogCitationGeoKey') {
                Count = metadata.GeoAsciiParams.length;
                TIFFTagLocation = Number(name2code.GeoAsciiParams);
                valueOffset = 0;
            }
            else {
                console.log(`[geotiff.js] couldn't get TIFFTagLocation for ${geoKey}`);
            }
            GeoKeyDirectory.push(TIFFTagLocation);
            GeoKeyDirectory.push(Count);
            GeoKeyDirectory.push(valueOffset);
        });
        metadata.GeoKeyDirectory = GeoKeyDirectory;
    }
    // delete GeoKeys from metadata, because stored in GeoKeyDirectory tag
    for (const geoKey of geoKeys) {
        if (metadata.hasOwnProperty(geoKey)) {
            delete metadata[geoKey];
        }
    }
    [
        'Compression',
        'ExtraSamples',
        'GeographicTypeGeoKey',
        'GTModelTypeGeoKey',
        'GTRasterTypeGeoKey',
        'ImageLength',
        'ImageWidth',
        'Orientation',
        'PhotometricInterpretation',
        'ProjectedCSTypeGeoKey',
        'PlanarConfiguration',
        'ResolutionUnit',
        'SamplesPerPixel',
        'XPosition',
        'YPosition',
        'RowsPerStrip',
    ].forEach((name) => {
        if (metadata[name]) {
            metadata[name] = toArray(metadata[name]);
        }
    });
    const encodedMetadata = convertToTids(metadata);
    const outputImage = encodeImage(flattenedValues, width, height, encodedMetadata);
    return outputImage;
}
exports.writeGeotiff = writeGeotiff;
//# sourceMappingURL=geotiffwriter.js.map