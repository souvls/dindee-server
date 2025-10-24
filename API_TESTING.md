# Land Property API Testing

## 1. Upload Single Land Property

```bash
curl -X POST http://localhost:3000/api/admin/land/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "title": "ที่ดินเมืองวียงจันทน์ 10 ไร่",
    "description": "ที่ดินสวยงามติดถนนใหญ่ เหมาะสำหรับการลงทุน มีน้ำไฟฟ้าครบ",
    "price": 500000000,
    "pricePerUnit": 12500000,
    "area": 40,
    "usableArea": 38,
    "location": {
      "address": {
        "street": "ถนนหลวงพระบาง",
        "district": "เมือง",
        "province": "วียงจันทน์",
        "postalCode": "01000",
        "country": "Laos"
      },
      "coordinates": {
        "latitude": 17.9757,
        "longitude": 102.6331
      },
      "nearbyPlaces": {
        "schools": ["โรงเรียนประถมบ้านดงใหญ่", "วิทยาลัยเทคนิควียงจันทน์"],
        "hospitals": ["โรงพยาบาลมิตรภาพ"],
        "shopping": ["ตลาดเช้าวียงจันทน์", "ห้างสรรพสินค้าวียงจันทน์"],
        "transport": ["สนามบินวัตตาย", "สถานีขนส่งกลาง"]
      }
    },
    "landDetails": {
      "dimensions": {
        "length": 200,
        "width": 200
      },
      "landType": "A",
      "landUse": "เกษตรกรรม",
      "soilType": "ดินร่วน",
      "waterSource": true,
      "roadAccess": true,
      "utilities": ["ไฟฟ้า", "น้ำประปา", "โทรศัพท์", "อินเทอร์เน็ต"]
    },
    "images": [
      "https://example.com/land1_1.jpg",
      "https://example.com/land1_2.jpg",
      "https://example.com/land1_3.jpg"
    ],
    "videos": [
      "https://example.com/land1_tour.mp4"
    ],
    "documents": [
      "https://example.com/land1_deed.pdf",
      "https://example.com/land1_survey.pdf"
    ],
    "tags": ["ที่ดินเกษตร", "ติดถนน", "น้ำไฟฟ้าครบ", "ลงทุน"],
    "keywords": ["ที่ดิน", "วียงจันทน์", "เกษตร", "ลงทุน"]
  }'
```

## 2. Upload Multiple Land Properties

```bash
curl -X POST http://localhost:3000/api/admin/land/upload-multiple \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "lands": [
      {
        "title": "ที่ดินบ้านไผ่ 5 ไร่",
        "description": "ที่ดินเกษตรกรรม วิวภูเขา สวยงาม",
        "price": 250000000,
        "area": 20,
        "location": {
          "address": {
            "street": "ถนนบ้านไผ่",
            "district": "ปากซัน",
            "province": "วียงจันทน์"
          },
          "coordinates": {
            "latitude": 18.1234,
            "longitude": 102.5678
          }
        },
        "landDetails": {
          "landType": "B",
          "landUse": "เกษตรกรรม",
          "waterSource": true,
          "roadAccess": true
        }
      },
      {
        "title": "ที่ดินติดแม่น้ำโขง 8 ไร่",
        "description": "ที่ดินติดแม่น้ำโขง เหมาะทำรีสอร์ท",
        "price": 800000000,
        "area": 32,
        "location": {
          "address": {
            "street": "ถนนริมโขง",
            "district": "เมือง",
            "province": "วียงจันทน์"
          },
          "coordinates": {
            "latitude": 17.9876,
            "longitude": 102.6543
          }
        },
        "landDetails": {
          "landType": "A",
          "landUse": "ท่องเที่ยว",
          "waterSource": true,
          "roadAccess": true
        }
      }
    ]
  }'
```

## 3. Search Land Properties Nearby

```bash
# ค้นหาที่ดินในรัศมี 10 กิโลเมตรจากใจกลางวียงจันทน์
curl -X GET "http://localhost:3000/api/admin/land/nearby?latitude=17.9757&longitude=102.6331&radius=10&page=1&limit=10"
```

## 4. Get All Land Properties with Filters

```bash
# ดึงที่ดินทั้งหมดในจังหวัดวียงจันทน์
curl -X GET "http://localhost:3000/api/admin/land?province=วียงจันทน์&page=1&limit=20"

# ดึงที่ดินที่มีขนาด 20-50 ไร่ และราคา 200-600 ล้าน
curl -X GET "http://localhost:3000/api/admin/land?minArea=20&maxArea=50&minPrice=200000000&maxPrice=600000000"

# ดึงที่ดินในอำเภอเมือง จังหวัดวียงจันทน์
curl -X GET "http://localhost:3000/api/admin/land?province=วียงจันทน์&district=เมือง"
```

## Sample Coordinates for Laos

### Major Cities in Laos:
- **Vientiane (วียงจันทน์)**: 17.9757, 102.6331
- **Luang Prabang (หลวงพระบาง)**: 19.8845, 102.1348
- **Pakse (ปากเซ)**: 15.1202, 105.7994
- **Savannakhet (สะหวันนะเขต)**: 16.5563, 104.7564
- **Thakhek (ท่าแขก)**: 17.4039, 104.7989

### Test Coordinates within Laos boundaries:
```json
{
  "coordinates_samples": [
    {"latitude": 17.9757, "longitude": 102.6331, "location": "Vientiane Center"},
    {"latitude": 18.1234, "longitude": 102.5678, "location": "North Vientiane"},
    {"latitude": 17.8456, "longitude": 102.7891, "location": "East Vientiane"},
    {"latitude": 19.8845, "longitude": 102.1348, "location": "Luang Prabang"},
    {"latitude": 15.1202, "longitude": 105.7994, "location": "Pakse"},
    {"latitude": 16.5563, "longitude": 104.7564, "location": "Savannakhet"},
    {"latitude": 17.4039, "longitude": 104.7989, "location": "Thakhek"}
  ]
}
```

## Response Examples

### Success Response (Single Upload):
```json
{
  "success": true,
  "message": "Land property uploaded successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6789012345",
    "title": "ที่ดินเมืองวียงจันทน์ 10 ไร่",
    "description": "ที่ดินสวยงามติดถนนใหญ่...",
    "price": 500000000,
    "area": 40,
    "location": {
      "address": {
        "street": "ถนนหลวงพระบาง",
        "district": "เมือง",
        "province": "วียงจันทน์"
      },
      "coordinates": {
        "latitude": 17.9757,
        "longitude": 102.6331
      }
    },
    "status": "approved",
    "createdAt": "2023-07-03T10:30:00.000Z"
  }
}
```

### Success Response (Multiple Upload):
```json
{
  "success": true,
  "message": "2 of 2 land properties uploaded successfully",
  "data": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "results": [
      {
        "index": 1,
        "id": "64a1b2c3d4e5f6789012346",
        "title": "ที่ดินบ้านไผ่ 5 ไร่",
        "status": "success"
      },
      {
        "index": 2,
        "id": "64a1b2c3d4e5f6789012347",
        "title": "ที่ดินติดแม่น้ำโขง 8 ไร่",
        "status": "success"
      }
    ],
    "errors": []
  }
}
```

### Error Response (Invalid Coordinates):
```json
{
  "success": false,
  "message": "Property coordinates must be within Laos boundaries",
  "errors": []
}
```

## Notes:
1. ต้องมี Admin token ในการอัพโหลด
2. พิกัดต้องอยู่ในขอบเขตประเทศลาว
3. ระบบจะแปลงพิกัดเป็น GeoJSON format อัตโนมัติ
4. การค้นหา nearby ใช้ MongoDB geospatial indexing
5. ราคาเป็นหน่วยกีบ (LAK)
6. พื้นที่เป็นหน่วยไร่