# API 명세

프로토타입의 실제 엔드포인트다. **이대로 구현하라는 뜻이 아니라 동작 계약**(어떤 입력에 어떤 검증·결과가 필요한가)을 전달하는 문서다. 경로·응답 형식은 기존 시스템 표준에 맞춰도 된다.

- 모든 요청/응답은 `application/json`
- 인증: 세션 쿠키 기반. **모든 엔드포인트가 로그인 필요**
- 권한 표기: 🔓 로그인만 / 🔒 관리자만 / 👤 본인만

## 목록

| 메서드 | 경로 | 권한 | 기능 |
|---|---|---|---|
| POST | `/api/leaves` | 🔓 | 휴가 신청 |
| PATCH | `/api/leaves/{id}` | 🔒 | 휴가 승인/반려 (+차감) |
| POST | `/api/overtime` | 🔓 | 시간외근무 신청 |
| PATCH | `/api/overtime/{id}` | 🔒 | 시간외근무 승인/반려 |
| GET | `/api/overtime/summary` | 🔓 | **본인 월 부여/사용/잔여 조회** |
| POST | `/api/adjustments` | 🔓 | 근무시간 조정 신청 |
| PATCH | `/api/adjustments/{id}` | 🔒 | 근무시간 조정 승인/반려 |
| GET | `/api/educations` | 🔓 | 본인 교육신청 목록 |
| POST | `/api/educations` | 🔓 | 교육 신청 |
| PATCH | `/api/educations/{id}` | 🔒/👤 | 승인·반려(관리자) 또는 결과 제출(본인) |
| GET | `/api/trips` | 🔓 | 본인 출장신청 목록 |
| POST | `/api/trips` | 🔓 | 출장 신청 |
| PATCH | `/api/trips/{id}` | 🔒/👤 | 승인·반려(관리자) 또는 결과 제출(본인) |
| GET | `/api/calendar` | 🔓 | 월별 통합 근태 일정 |
| GET | `/api/admin/quotas` | 🔒 | 연도별 직원 휴가 부여 현황 |
| POST | `/api/admin/quotas` | 🔒 | **휴가 일괄 부여** |
| GET | `/api/admin/overtime-quotas` | 🔒 | 연도별 직원 월 부여시간 현황 |
| POST | `/api/admin/overtime-quotas` | 🔒 | **시간외근무 일괄 부여** |
| GET | `/api/admin/leavetypes` | 🔒 | 휴가 종류 목록 |
| POST | `/api/admin/leavetypes` | 🔒 | 휴가 종류 등록/수정 |
| POST | `/api/admin/users` | 🔒 | 직원 계정 등록 |

---

## 1. 휴가

### POST `/api/leaves` 🔓

```jsonc
// 요청
{
  "type": "ANNUAL",          // 필수. LeaveType.code 또는 HALF_AM/HALF_PM
  "startDate": "2026-08-12", // 필수
  "endDate": "2026-08-13",   // 필수
  "daysUsed": 2,             // 필수. 0.5 단위
  "reason": "여름 휴가"        // 선택
}
```
| 코드 | 조건 |
|---|---|
| 201 | 생성됨 (`status: "PENDING"`) |
| 400 | 필수값 누락 |
| 401 | 미인증 |

### PATCH `/api/leaves/{id}` 🔒

```jsonc
{ "status": "APPROVED" }   // APPROVED | REJECTED
```

승인 시 트랜잭션으로 **부여 한도 차감**까지 수행한다 → [BUSINESS-RULES §3](BUSINESS-RULES.md#3-휴가-승인-시-차감-규칙)

| 코드 | 조건 |
|---|---|
| 200 | 처리됨 |
| 400 | 잘못된 status / 이미 처리된 건 |
| 403 | 관리자 아님 |
| 500 | 신청 없음 (`Request not found`) |

---

## 2. 시간외근무

### POST `/api/overtime` 🔓

```jsonc
{
  "date": "2026-08-18",       // 필수
  "startTime": "19:00",       // 필수 HH:MM
  "endTime": "21:00",         // 필수 HH:MM
  "description": "월말 마감"    // 선택(화면에서는 필수)
}
```

`totalHours` 는 **서버가 계산**한다 → [BUSINESS-RULES §2](BUSINESS-RULES.md#2-시간외근무-시간-계산)

| 코드 | 조건 |
|---|---|
| 201 | 생성됨 |
| 400 | 필수값 누락 |

> 월 한도 초과 여부는 **서버에서 막지 않는다**. 안내는 화면에서 처리한다.

### PATCH `/api/overtime/{id}` 🔒

```jsonc
{ "status": "APPROVED" }
```
| 코드 | 조건 |
|---|---|
| 200 | 처리됨 |
| 400 | 잘못된 status |
| 403 | 관리자 아님 |

> ⚠️ 이미 처리된 건에 대한 가드가 없다(휴가와 불일치). 통합 시 추가할 것.

### GET `/api/overtime/summary?year=2026&month=8` 🔓

본인 기준. 파라미터 생략 시 현재 연·월.

```jsonc
// 200
{
  "year": 2026,
  "month": 8,
  "monthlyHours": 15,      // 부여 (월 한도)
  "usedHours": 14,         // APPROVED 합계
  "pendingHours": 0,       // 결재 대기 합계 (사용량 미포함)
  "remainingHours": 1,     // 부여 - 사용 (음수 가능 = 초과)
  "hasQuota": true         // false면 부여 미설정
}
```
| 코드 | 조건 |
|---|---|
| 200 | 정상 |
| 400 | month 범위 오류(1~12) |

---

## 3. 근무시간 조정

### POST `/api/adjustments` 🔓

```jsonc
{
  "applyDate": "2026-08-19",         // 필수
  "originalTime": "09:00 - 18:00",   // 필수
  "requestedTime": "09:30 - 18:30",  // 필수
  "reason": "육아 등원"                // 선택
}
```

### PATCH `/api/adjustments/{id}` 🔒

```jsonc
{ "status": "APPROVED" }
```

> 승인해도 `User.baseSchedule` 은 변경되지 않는다(이력만 관리). ⚠️ 이미 처리된 건 가드 없음.

---

## 4. 교육

### GET `/api/educations` 🔓
본인의 교육신청 전체를 `startDate DESC` 로 반환. (결과보고 화면에서 승인 건만 필터링해 사용)

### POST `/api/educations` 🔓

```jsonc
{
  "title": "개인정보보호 실무자 과정",  // 필수
  "institution": "한국생산성본부",     // 선택
  "startDate": "2026-08-24",         // 필수
  "endDate": "2026-08-26",           // 필수
  "cost": 350000,                    // 선택, 기본 0
  "purpose": "처리방침 개정 대응"       // 선택
}
```
| 코드 | 조건 |
|---|---|
| 201 | 생성됨 |
| 400 | 교육명/기간 누락, **종료일 < 시작일** |

### PATCH `/api/educations/{id}` 🔒 / 👤

**요청 본문에 따라 두 가지로 동작한다.**

```jsonc
// (A) 관리자 승인·반려
{ "status": "APPROVED" }

// (B) 신청자 본인의 결과보고 제출
{ "resultContent": "교육 내용 요약 ..." }
```

| 코드 | 조건 |
|---|---|
| 200 | 처리됨 |
| 400 | 잘못된 status / 이미 처리된 건 / 결과 내용 공백 / **승인 안 된 건에 결과 제출** |
| 403 | (A) 관리자 아님 / (B) 본인 신청 아님 |
| 404 | 신청 없음 |

---

## 5. 출장

`/api/trips`, `/api/trips/{id}` — 교육과 **동일한 구조**다.

```jsonc
// POST /api/trips
{
  "destination": "부산 지사",       // 필수
  "purpose": "하반기 계획 협의",     // 선택
  "startDate": "2026-08-20",      // 필수
  "endDate": "2026-08-21",        // 필수
  "companions": "홍길동",           // 선택
  "cost": 180000                  // 선택, 기본 0
}
```

---

## 6. 달력

### GET `/api/calendar?year=2026&month=8&scope=me` 🔓

| 파라미터 | 필수 | 설명 |
|---|---|---|
| year | | 생략 시 현재 연도 |
| month | | 1~12, 생략 시 현재 월 |
| scope | | `me`(기본) / `all`. **`all` 은 관리자만 유효, 일반 직원은 서버에서 `me` 로 강등** |

```jsonc
// 200
{
  "year": 2026, "month": 8,
  "scope": "me",                    // 실제 적용된 범위
  "baseSchedule": "09:00-18:00",    // 요청자의 기본 근무시간
  "leaves":      [ /* user:{name,department} 포함 */ ],
  "trips":       [ ],
  "educations":  [ ],
  "adjustments": [ ],
  "overtimes":   [ ]
}
```

- **`REJECTED` 건은 제외**된다.
- 기간형(휴가·교육·출장)은 **월과 겹치기만 하면 포함**된다 → [BUSINESS-RULES §6](BUSINESS-RULES.md#6-달력-표시-규칙)

---

## 7. 관리자 — 휴가 부여

### GET `/api/admin/quotas?year=2026` 🔒

```jsonc
{
  "year": 2026,
  "users": [
    {
      "id": "...", "name": "홍길동", "email": "...", "department": "개발팀",
      "leaveQuotas": [
        { "id": "...", "year": 2026, "leaveType": "ANNUAL", "totalDays": 17, "usedDays": 2 }
      ]
    }
  ],
  "leaveTypes": [ { "code": "ANNUAL", "name": "연차", "isPaid": true } ]
}
```

### POST `/api/admin/quotas` 🔒 — 일괄 부여

```jsonc
{
  "year": 2026,
  "leaveType": "ANNUAL",        // 필수
  "items": [                    // 일괄
    { "userId": "u1", "totalDays": 18 },
    { "userId": "u2", "totalDays": 17 }
  ]
}
```
단건 형식(`{year, leaveType, userId, totalDays}`)도 하위호환으로 허용한다.

```jsonc
// 200
{ "ok": true, "year": 2026, "leaveType": "ANNUAL", "saved": 2 }
```

| 코드 | 조건 |
|---|---|
| 200 | 저장됨 |
| 400 | 연도/휴가종류 누락, 숫자 아님, **음수**, 대상 0명 |
| 403 | 관리자 아님 |

전체를 **하나의 트랜잭션**으로 upsert 하며, `leaveType == ANNUAL` 이면 `User.annualLeaveTotal` 도 갱신한다.

---

## 8. 관리자 — 시간외근무 부여

### GET `/api/admin/overtime-quotas?year=2026` 🔒

```jsonc
{
  "year": 2026,
  "refMonth": 8,                  // 사용량 집계 기준 월(현재 월)
  "users": [
    {
      "id": "...", "name": "홍길동", "email": "...", "department": "개발팀",
      "monthlyHours": 15,         // 부여 (월 한도)
      "usedThisMonth": 14         // 참고용 이번 달 승인 사용량
    }
  ]
}
```

### POST `/api/admin/overtime-quotas` 🔒 — 일괄 부여

```jsonc
{
  "year": 2026,
  "items": [
    { "userId": "u1", "monthlyHours": 15 },
    { "userId": "u2", "monthlyHours": 15 }
  ]
}
```

```jsonc
// 200
{ "ok": true, "year": 2026, "saved": 2 }
```

| 코드 | 조건 |
|---|---|
| 400 | year/items 누락, 숫자 아님, **음수**, 대상 0명 |
| 403 | 관리자 아님 |

---

## 9. 관리자 — 기준정보 / 계정

### GET `/api/admin/leavetypes` 🔒
휴가 종류 전체를 `createdAt ASC` 로 반환.

### POST `/api/admin/leavetypes` 🔒

```jsonc
{
  "code": "refresh",        // 필수. 서버가 대문자화 + 공백→언더스코어 변환
  "name": "리프레시 휴가",     // 필수
  "description": "...",     // 선택
  "isPaid": true            // 선택, 기본 true
}
```
`code` 기준 **upsert**(이미 있으면 수정). 201 반환.

### POST `/api/admin/users` 🔒

```jsonc
{
  "name": "김신입",
  "email": "new@company.com",   // 필수, 중복 불가
  "department": "개발팀",
  "role": "USER",               // 기본 USER
  "annualLeaveTotal": 15        // 기본 15
}
```
| 코드 | 조건 |
|---|---|
| 201 | 생성됨 |
| 400 | 이메일 누락 / **이미 등록된 이메일** |
| 403 | 관리자 아님 |

---

## 10. 공통 오류 형식

```jsonc
{ "error": "사람이 읽을 수 있는 메시지" }
```

| 코드 | 의미 |
|---|---|
| 400 | 입력 검증 실패 |
| 401 | 미인증 |
| 403 | 권한 없음 |
| 404 | 대상 없음 |
| 500 | 서버 오류 |

> 프로토타입은 401/403 사용이 엔드포인트마다 일관되지 않다(일부는 미인증에도 403). 통합 시 표준화할 것.
