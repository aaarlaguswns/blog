
# Number

특이한 것만 정리

Number.isSafeInteger: 안전한 정수 값인지 판단

안전한 정수값은 -(2^53-1) ~ 2^53-1

Number.prototype.toExponential: 숫자를 지수 표기법으로 변환하여 문자열로 반환

Number.protoype.toFixed: 숫자를 반올림하여 문자열로 반환

Number.prototype.toString: 인수로 전달받은 전체 자릿수까지 유효하도록 나머지 자릿수를 반올림하여 문자열로 반환한다

```javascript
var n = 123.112

n.toPrecision(3)  // "123"
n.toPrecision(4) // "123.1"
n.toPrecision(5) // "123.11"
```

Number.prototype.toString: 숫자를 문자열로 변환하여 반환

```javascript
var count = 10;
count.toString();   // '10'
(17).toString();    // '17'
17 .toString();     // '17'
(17.2).toString();  // '17.2'

var x = 16;
x.toString(2);       // '10000'
x.toString(8);       // '20'
x.toString(16);      // '10'

(254).toString(16);  // 'fe'
(-10).toString(2);   // '-1010'
(-0xff).toString(2); // '-11111111'
```

## Math

표준 빌트인 객체인 Math는 수학적인 상수와 ㅎ암수를 위한 프로퍼티와 메서드를 제공한다
Math는 생성자 함수가 아니고 정적 프로퍼티와 정적 메서드만 제공한다

Math.ceil: 인수로 전달된 숫자의 소수점 이하를 올림한 정수를 반환한다

```javascript
Math.ceil(1.4);  // 2
Math.ceil(1.6);  // 2
Math.ceil(-1.4); // -1
Math.ceil(-1.6); // -1
Math.ceil(1);    // 1
Math.ceil();     // NaN
```

Math.max: 전달받은 인수 중에서 가장 큰 수를 반환한다

```javascript
Math.max();    // -Infinity
```

Math.min(): 전달받은 인수 중에서 가장 작은 수를 반환한다

```javascript
Math.min();     //Infinity
```

## Date

Date도 표준 빌트인 객체로 날짜와 시간을 위한 메서드를 제공하는 빌트인 객체이자 생성자 함수이다

### Date 생성자 함수

new 연산자와 함께 호출하면 현재 날짜와 시간을가지는 date객체를 반환한다

```javascript
const date = new Date();
console.log(date); // Thu May 16 2019 17:16:13 GMT+0900 (한국 표준시)
```

### Date 메서드

Date.now: 1970년 1월 1일 00:00:00(UTC)을 기점으로 현재 시간까지 경과한 밀리초를 숫자로 반환한다.

## RegExp

RegExp란 정규표현식의 줄임말로 문자열에서 특정 패턴을 찾거나 바꾸기 위해 사용하는 **검색 규칙**이다

왜 사용하는가?

1. 패턴 검증: 예를 들어 이메일 형식이나 비밀번호가 특정 규칙을 따르는지 확인할때
2. 문자열 검색: 도서관에서 책을 찾거나 복잡한 문자열 안에서 숫자로만 이루어진 부분이나 a로 시작하는 단어같은 것을 찾을때
3. 문자열 대체: 텍스트의 특정 부분을 찾아서 다른 내용으로 바꿀 때

RegExp를 만드는 방법

1. 정규 표현식 리터럴
2. RegExp 생성자

```javascript
// 리터럴 방식
const regex = /abc/;

// 생성자 방식
const regex = new RegExp("abc");
const regex = new RegExp(/abc/); // 이렇게 해도 됨
```

![정규표현식](./asset/14.png)

```javascript
// 정규표현식을 담은 변수
const regex = /apple/; // apple 이라는 단어가 있는지 필터링

// "문자열"이 "정규표현식"과 매칭되면 true, 아니면 false반환
regex.test("Hello banana and apple hahahaha"); // true

// "문자열"에서 "정규표현식"에 매칭되는 항목들을 배열로 반환
const txt = "Hello banana and apple hahahaha";
txt.match(regex); // ['apple']

// "정규표현식"에 매칭되는 항목을 "대체문자열"로 변환
txt.replace(regex, "watermelon"); // 'Hello banana and watermelon hahahaha'
```

### 정규식 플래그

정규식 플래그는 정규식을 생성할 때 고급 검색을 위한 전역 옵션을 설정할 수 있도록 지원하는 기능이다.

Flag    Meaning      Description
i       Ignore Case  대소문자를 구별하지 않고 검색한다.
g       global       문자열 내의 모든 패턴을 검색한다
m       multi line   문자열의 행이 바뀌더라도 검색을 계속한다
s                    개행 문자도 포함
u       unicode      유니코드 전체를 지원
y       sticky       문자 내 특정 위치에서 검색을 진행하는 'sticky'모드를 활성화

## String

### string 메서드

String.prototype.indexOf: indexOf 메서드는 대상 문자열에서 인수로 전달받은 문자열을 검색하여 첫 번째 인덱스를 반환한다

```javascript
const str = 'Hello World';

console.log(str.indexOf('l'));  // 2
console.log(str.indexOf('or')); // 7
console.log(str.indexOf('or' , 8)); // -1

if (str.indexOf('Hello') !== -1) {
  // 문자열 str에 'hello'가 포함되어 있는 경우에 처리할 내용
}

// ES6: String.prototype.includes
if (str.includes('Hello')) {
  // 문자열 str에 'hello'가 포함되어 있는 경우에 처리할 내용
}
```

String.prototype.search: search 메서드는 대상 문자열에서 인수로 전달받은 정규 표현식과 매치하는 문자열을 검색하여 일치하는 문자열의 인덱스를 반환한다

String.prototype.includes: includes 메서드는 대상 문자열에 인수로 전달받은 문자열이 포함되어 있는지 확인하여 그 결과를 boo로 반환한다

String.prototype.startswith:startsWith메서드는 대상 문자열이 인수로 전달받은 문자열로 시작하는지 확인하여 결과를 bool로 반환

## Symbol

Symbol이란 7번째 데이터 타입으로 변경 불가능한 원시 타입의 값이다. 심벌 값은 다른 값과 중복되지 않는 유일무이한 값이다
따라서 주로 이름의 충돌 위험이 없는 유일한 프로퍼티 키를 만들기 위해 사용한다
