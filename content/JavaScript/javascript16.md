
# 프로퍼티 어트리뷰트

객체의 속성이 가지는 숨겨진 내부 상태 값

어트리뷰트들은 프로퍼티의 값자체가 아니라, 그 프로퍼티의 동작 방식을 제어하는 설정값들입니다

## 데이터 프로퍼티

- [[Value]] : 프로퍼티의 실제 값
- [[Writable]] : (쓰기 가능 여부) true면 값을 수정할수있고, false면 읽기전용
- [[Enumerable]] : (열거 가능 여부) true면 for...in 루프나 Object.keys() 등으로 프로퍼티를 나열할 때 포함됩니다
- [[Configurable]] : (재정의 가능 여부) true면 해당 프로퍼티를 삭제하거나, [[Writable]], [[Enumerable]], [[Configurable]] 어트리뷰트 자체를 변경할 수 있습니다. false면 삭제나 어트리뷰트 변경이 불가능합니다

## 접근자 프로퍼티

값 대신 getter setter 함수를 가지는 프로퍼티입니다 프로퍼티에 접근하거나 값을 할당할때 이 함수들이 대신 호출된다

- [[Get]]: 프로퍼티를 읽으려고 할 때 호출되는 함수입니다(getter)
- [[Set]]: 프로퍼티에 값을 할당하려고 할 때 호출되는 함수입니다. (setter)
- [[Enumerable]]: 데이터 프로퍼티와 동일합니다.
- [[Configurable]]: 데이터 프로퍼티와 동일합니다.

이러한 내부 어트리뷰트는 .이나 []로 직접 접근이 불가능해서 특별한 메서드를 사용해야한다

1. 어트리뷰트 확인하기 : Object.getOwnPropertyDescriptor()
특정 프로퍼티의 어트리뷰트 객체를 반환한다

```javascript
const person = {
  name: 'Lee'
};

// 프로퍼티 어트리뷰트 정보를 제공하는 프로퍼티 디스크립터 객체를 반환한다.
console.log(Object.getOwnPropertyDescriptor(person, 'name'));
// {value: "Lee", writable: true, enumerable: true, configurable: true}
```

2. 어트리뷰트 정의/수정하기: Object.defineProperty()

새로운 프로퍼티를 생성하거나 기존 프로퍼티의 어트리뷰트를 변경할 때 사용

예시: 읽기 전용 프로퍼티 만들기

```javascript
const user = {};

Object.defineProperty(user, 'id', {
  value: 1001,
  writable: false,  // 쓰기 금지
  enumerable: true,
  configurable: false // 삭제 및 재정의 금지
});

console.log(user.id); // 1001

user.id = 1002; // 값을 변경하려고 시도
console.log(user.id); // 1001 (값은 변경되지 않습니다. 'use strict' 모드에서는 에러 발생)

delete user.id; // 삭제 시도
console.log(user.id); // 1001 (삭제되지 않습니다.)
```

예시: 접근자 프로퍼티(getter/setter) 정의하기

```javascript
const person = {
  firstName: 'John',
  lastName: 'Doe'
};

Object.defineProperty(person, 'fullName', {
  // getter 함수: fullName을 읽을 때 호출됨
  get: function() {
    return `${this.firstName} ${this.lastName}`;
  },
  
  // setter 함수: fullName에 값을 할당할 때 호출됨
  set: function(name) {
    const parts = name.split(' ');
    this.firstName = parts[0];
    this.lastName = parts[1];
  },

  enumerable: true,
  configurable: true
});

console.log(person.fullName); // "John Doe" (get 호출)

person.fullName = 'Jane Smith'; // set 호출
console.log(person.firstName); // "Jane"
console.log(person.lastName);  // "Smith"
```

요약
프로퍼티 어트리뷰트는 객체 프로퍼티의 세부동작(쓰기, 열거, 삭제 등)을 제어하기 위한 메타데이터입니다

Object.defineProperty()나 Object.getOwnPropertyDescriptor()를 통해 이 값들을 확인하고 제어할 수 있습니다.
