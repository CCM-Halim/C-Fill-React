// Override slotMap untuk 8 file yang template internalnya beneran beda dari
// mayoritas - termasuk explicitAnchors (baris merge asli hasil baca langsung
// dari file, dipakai duluan sebelum rumus periode).
export const SLOT_MAP_OVERRIDES = {
  "K77 + 350 Repeater Inlet Tunnel 4.xlsx": {
    "cat19": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 11,
      "slotStartRow": 10,
      "slotStep": 1,
      "slotCount": 1,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 6
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i7",
          "colStart": 8,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i8",
          "colStart": 9,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i9",
          "colStart": 10,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  "Video Poll CCTV Tangga Darurat K22 + 802.xlsx": {
    "cat35": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 7,
      "slotStartRow": 11,
      "slotStep": 2,
      "slotCount": 11,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  "Video Poll CCTV Tangga Darurat K25 + 725 .xlsx": {
    "cat35": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 7,
      "slotStartRow": 11,
      "slotStep": 2,
      "slotCount": 11,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  "Video Poll CCTV Tangga Darurat K29 + 043.xlsx": {
    "cat35": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 7,
      "slotStartRow": 11,
      "slotStep": 2,
      "slotCount": 11,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  "Video Poll CCTV Tangga Darurat K34 + 898 .xlsx": {
    "cat35": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 7,
      "slotStartRow": 12,
      "slotStep": 2,
      "slotCount": 10,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 3
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 12
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 12
        }
      ],
      "type": "monthly_slot"
    }
  },
  "K0+316 Halim Signal Building Communication (101).xlsx": {
    "cat12": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 19,
      "slotStartRow": 11,
      "slotStep": 2,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3,
          "explicitAnchors": [
            11,
            18,
            25,
            32
          ]
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 12,
          "periodMonths": 3
        }
      ],
      "type": "monthly_slot"
    }
  },
  "K41+607 Karawang Signal Building Communication (202).xlsx": {
    "cat12": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 19,
      "slotStartRow": 11,
      "slotStep": 2,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3,
          "explicitAnchors": [
            11,
            19,
            27,
            33
          ]
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 12,
          "periodMonths": 3
        }
      ],
      "type": "monthly_slot"
    }
  },
  "K27+985 Signal Relay Station 2 (HA-KA 7 _ BTS 7).xlsx": {
    "cat08": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 20,
      "slotStartRow": 11,
      "slotStep": 2,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3,
          "explicitAnchors": [
            11,
            21,
            31,
            41
          ]
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 12,
          "periodMonths": 3
        },
        {
          "id": "i7",
          "colStart": 19,
          "colWidth": 1,
          "periodMonths": 3,
          "explicitAnchors": [
            11,
            21,
            31,
            41
          ]
        }
      ],
      "type": "monthly_slot"
    },
    "cat10": {
      "headerRow": 6,
      "dateCol": 1,
      "petugasCol": 20,
      "slotStartRow": 11,
      "slotStep": 2,
      "slotCount": 12,
      "itemColumns": [
        {
          "id": "i1",
          "colStart": 2,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i2",
          "colStart": 3,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i3",
          "colStart": 4,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i4",
          "colStart": 5,
          "colWidth": 1,
          "periodMonths": 1
        },
        {
          "id": "i5",
          "colStart": 6,
          "colWidth": 1,
          "periodMonths": 3,
          "explicitAnchors": [
            11,
            21,
            31,
            41
          ]
        },
        {
          "id": "i6",
          "colStart": 7,
          "colWidth": 12,
          "periodMonths": 3
        },
        {
          "id": "i7",
          "colStart": 19,
          "colWidth": 1,
          "periodMonths": 3,
          "explicitAnchors": [
            11,
            21,
            31,
            41
          ]
        }
      ],
      "type": "monthly_slot"
    }
  }
};
