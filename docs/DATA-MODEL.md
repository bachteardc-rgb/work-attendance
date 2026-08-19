# 데이터 모델

현재 프로토타입은 **PostgreSQL + Prisma**로 구현되어 있다. 아래는 통합관리시스템으로 옮길 때 참고할 논리 모델이며, 물리 설계(명명 규칙·인덱스·감사컬럼)는 기존 시스템 표준에 맞추면 된다.

## 1. 관계도

```
                          ┌──────────────────┐
                          │      User        │  직원
                          │  (사용자 마스터)   │
                          └────────┬─────────┘
                                   │ 1
        ┌──────────────┬───────────┼───────────┬──────────────┬──────────────┐
        │ N            │ N         │ N         │ N            │ N            │ N
┌───────┴──────┐ ┌─────┴──────┐ ┌──┴────────┐ ┌┴───────────┐ ┌┴───────────┐ ┌┴──────────┐
│ LeaveRequest │ │ Overtime   │ │ Schedule  │ │ Education  │ │BusinessTrip│ │ LeaveQuota│
│  휴가신청     │ │ Request    │ │ Adjustment│ │ Request    │ │ Request    │ │ 휴가부여   │
│              │ │ 시간외근무   │ │ 근무시간조정│ │ 교육신청+결과│ │ 출장신청+결과│ │           │
└──────────────┘ └────────────┘ └───────────┘ └────────────┘ └────────────┘ └───────────┘
                                                                             ┌───────────┐
                                                                             │OvertimeQuota│
                                                                             │ 시간외부여  │
                                                                             └───────────┘

┌──────────────┐
│  LeaveType   │  휴가 종류 기준정보 (User와 직접 관계 없음, code로 참조)
└──────────────┘
```

`LeaveQuota.leaveType` 과 `LeaveRequest.type` 은 `LeaveType.code` 를 **문자열로 참조**한다(FK 아님). 통합 시 FK로 정규화할지 결정 필요.

모든 자식 테이블은 `User` 삭제 시 `CASCADE` 삭제된다.

## 2. 테이블 정의

### 2.1 User — 직원

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| id | String(cuid) | ✔ | 자동 | PK |
| name | String | | | 성명 |
| email | String | | | **UNIQUE**, 로그인 식별자 |
| emailVerified | DateTime | | | 인증 연동용 |
| image | String | | | 프로필 이미지 URL |
| department | String | | | 부서명 (문자열, 조직코드 아님) |
| baseSchedule | String | ✔ | `"09:00-18:00"` | 기본 근무시간 |
| annualLeaveTotal | Float | ✔ | `15.0` | 연차 총량 (LeaveQuota와 중복 보유) |
| annualLeaveUsed | Float | ✔ | `0.0` | 연차 사용량 (LeaveQuota와 중복 보유) |
| role | String | ✔ | `"USER"` | `USER` / `ADMIN` |

> ⚠️ **정규화 필요**: `annualLeaveTotal/annualLeaveUsed` 는 `LeaveQuota`(year=올해, leaveType=`ANNUAL`)와 **같은 정보를 중복 저장**한다. 프로토타입은 승인 시 양쪽을 함께 갱신해 동기화하지만, 통합 시에는 `LeaveQuota` 한쪽으로 일원화할 것을 권장한다.

> ⚠️ `department` 가 자유 문자열이라 부서별 집계·조직개편에 취약하다. 통합 시 조직 마스터 FK로 대체할 것.

### 2.2 LeaveType — 휴가 종류 (기준정보)

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| id | String(cuid) | ✔ | 자동 | PK |
| code | String | ✔ | | **UNIQUE**. 대문자·언더스코어 (예: `FAMILY_CARE`) |
| name | String | ✔ | | 화면 표시명 (예: 가족돌봄휴가) |
| isPaid | Boolean | ✔ | `true` | 유급 여부 |
| description | String | | | 설명 |
| createdAt | DateTime | ✔ | now() | 목록 정렬 기준 |

**초기 데이터**

| code | name | isPaid |
|---|---|---|
| ANNUAL | 연차 | true |
| SICK | 병가 | true |
| OFFICIAL | 공가 | true |
| FAMILY_CARE | 가족돌봄휴가 | **false** |
| COMPENSATORY | 대체휴가 | true |

### 2.3 LeaveQuota — 연도별 휴가 부여

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| id | String(cuid) | ✔ | 자동 | PK |
| userId | String | ✔ | | FK → User |
| year | Int | ✔ | | 적용 연도 (예: 2026) |
| leaveType | String | ✔ | | LeaveType.code |
| totalDays | Float | ✔ | | 부여 일수 |
| usedDays | Float | ✔ | `0.0` | 사용 일수 (승인 시 증가) |
| createdAt / updatedAt | DateTime | ✔ | | |

**UNIQUE (userId, year, leaveType)**

### 2.4 OvertimeQuota — 시간외근무 부여 (월 한도)

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| id | String(cuid) | ✔ | 자동 | PK |
| userId | String | ✔ | | FK → User |
| year | Int | ✔ | | 적용 연도 |
| monthlyHours | Float | ✔ | `0.0` | **매월** 사용 가능 시간 |
| createdAt / updatedAt | DateTime | ✔ | | |

**UNIQUE (userId, year)**

> `monthlyHours` 는 연도 단위로 1건만 등록하며, **그 해의 모든 달에 동일하게 적용**된다. 사용량은 월별로 리셋된다(1월 사용량이 2월에 이월되지 않음).
> 월마다 다른 한도가 필요하면 `month` 컬럼 추가 + UNIQUE(userId, year, month)로 확장.

### 2.5 LeaveRequest — 휴가 신청

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| id | String(cuid) | ✔ | 자동 | PK |
| userId | String | ✔ | | FK → User |
| type | String | ✔ | | LeaveType.code 또는 `HALF_AM`/`HALF_PM` |
| startDate | DateTime | ✔ | | 시작일 |
| endDate | DateTime | ✔ | | 종료일 |
| daysUsed | Float | ✔ | | 사용 일수 (0.5 단위) |
| reason | String | | | 사유 |
| status | String | ✔ | `"PENDING"` | `PENDING`/`APPROVED`/`REJECTED` |
| createdAt / updatedAt | DateTime | ✔ | | |

> `daysUsed` 는 **신청자가 직접 입력**하며 기간에서 자동 계산하지 않는다. 주말·공휴일 제외 로직이 없다 → 통합 시 사내 달력 기준 자동 산정 검토.

### 2.6 OvertimeRequest — 시간외근무 신청

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| id | String(cuid) | ✔ | 자동 | PK |
| userId | String | ✔ | | FK → User |
| date | DateTime | ✔ | | 근무일 |
| startTime | String | ✔ | | `"18:00"` 형식 |
| endTime | String | ✔ | | `"21:30"` 형식 |
| totalHours | Float | ✔ | | 서버 계산값 (2.2 참고) |
| description | String | | | 업무 내용 (화면에서는 필수) |
| status | String | ✔ | `"PENDING"` | |
| createdAt / updatedAt | DateTime | ✔ | | |

> 시각을 문자열로 저장한다. 통합 시 `time` 타입 또는 분 단위 정수 권장.

### 2.7 ScheduleAdjustment — 근무시간 조정 신청

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| id | String(cuid) | ✔ | 자동 | PK |
| userId | String | ✔ | | FK → User |
| applyDate | DateTime | ✔ | | 적용 희망일 |
| originalTime | String | ✔ | | 기존 근무시간 (예: `"09:00 - 18:00"`) |
| requestedTime | String | ✔ | | 변경 희망 근무시간 |
| reason | String | | | 사유 |
| status | String | ✔ | `"PENDING"` | |
| createdAt / updatedAt | DateTime | ✔ | | |

### 2.8 EducationRequest — 교육 신청 + 결과

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| id | String(cuid) | ✔ | 자동 | PK |
| userId | String | ✔ | | FK → User |
| title | String | ✔ | | 교육명 |
| institution | String | | | 교육기관 |
| startDate / endDate | DateTime | ✔ | | 교육 기간 |
| cost | Float | ✔ | `0.0` | 교육비(원) |
| purpose | String | | | 목적 및 사유 |
| status | String | ✔ | `"PENDING"` | |
| **resultContent** | String | | | **결과보고 내용** |
| **resultSubmittedAt** | DateTime | | | **결과 최종 제출일시** (NULL이면 미제출) |
| createdAt / updatedAt | DateTime | ✔ | | |

### 2.9 BusinessTripRequest — 출장 신청 + 결과

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| id | String(cuid) | ✔ | 자동 | PK |
| userId | String | ✔ | | FK → User |
| destination | String | ✔ | | 출장지 |
| purpose | String | | | 출장 목적 |
| startDate / endDate | DateTime | ✔ | | 출장 기간 |
| companions | String | | | 동행자 (자유 문자열) |
| cost | Float | ✔ | `0.0` | 출장비(원) |
| status | String | ✔ | `"PENDING"` | |
| **resultContent** | String | | | **결과보고 내용** |
| **resultSubmittedAt** | DateTime | | | **결과 최종 제출일시** |
| createdAt / updatedAt | DateTime | ✔ | | |

> 교육·출장 결과를 **별도 테이블이 아니라 신청 레코드의 컬럼**으로 설계했다. 1신청 : 1결과 관계이고 조인 없이 제출 여부를 판정할 수 있기 때문. 결과 이력(수정 이력)을 남겨야 하면 별도 테이블로 분리 필요.

### 2.10 인증 테이블 (Account / Session / VerificationToken)

NextAuth.js 표준 스키마이며 **통합 시 불필요**하다. 통합관리시스템의 인증 체계를 사용하고 이 테이블들은 제거한다.

## 3. 공통 코드값

### 3.1 결재 상태 (`status`) — 5개 신청 테이블 공통

| 값 | 표시 | 설명 |
|---|---|---|
| `PENDING` | 대기 중 | 등록 직후 기본값 |
| `APPROVED` | 승인됨 | 관리자 승인. 휴가는 이때 차감 발생 |
| `REJECTED` | 반려됨 | 달력·집계에서 제외 |

### 3.2 권한 (`User.role`)

| 값 | 설명 |
|---|---|
| `USER` | 일반 직원 |
| `ADMIN` | 관리자(인사) |

## 4. 인덱스 권장

조회 패턴상 아래 인덱스를 권장한다.

| 테이블 | 인덱스 | 용도 |
|---|---|---|
| LeaveRequest | (userId, createdAt DESC) | 내 최근 신청 |
| LeaveRequest | (status) | 결재함 |
| LeaveRequest | (startDate, endDate) | 달력 월별 조회 |
| OvertimeRequest | (userId, status, date) | 월 사용시간 집계 |
| OvertimeRequest | (status, date) | 전 직원 월 집계 |
| ScheduleAdjustment | (status, applyDate DESC) | 시간대별 근무 현황 |
| EducationRequest / BusinessTripRequest | (status), (startDate, endDate) | 결재함·달력 |
| EducationRequest / BusinessTripRequest | (resultSubmittedAt DESC) | 결과보고 열람 |
