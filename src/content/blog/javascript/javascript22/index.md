---
title: this
description: this는 잣긴이 속한 객체 또는 자신이 생성할 인스턴스를 가리키는 자기 참조 변수다. this를 통해 자신이 속한 객체 또는 자신이 생성할 인스턴스의 프로퍼티나 메서드를 참조할 수 있다
date: 2025-12-06T10:38:09.000Z
---

단, this가 가리키는 값, 즉 **this 바인딩**은 함수 호출 방식에 의해 동적으로 결정된다

```javascript
// 생성자 함수
function Circle(radius) 
{
  // this는 생성자 함수가 생성할 인스턴스를 가리킨다.
  this.radius = radius;
}

Circle.prototype.getDiameter = function () 
{
  // this는 생성자 함수가 생성할 인스턴스를 가리킨다.
  return 2 * this.radius;
};

// 인스턴스 생성
const circle = new Circle(5);
console.log(circle.getDiameter()); // 10
```

자바스크립트에서 this는 함수가 호출되는 방식에 따라 this에 바인딩될 값, 즉 this 바인딩이 동적으로 결정된다

```javascript
// this는 어디서든지 참조 가능하다.
// 전역에서 this는 전역 객체 window를 가리킨다.
console.log(this); // window

function square(number) 
{
  // 일반 함수 내부에서 this는 전역 객체 window를 가리킨다.
  console.log(this); // window
  return number * number;
}
square(2);

const person = {
  name: 'Lee',
  getName() 
  {
    // 메서드 내부에서 this는 메서드를 호출한 객체를 가리킨다.
    console.log(this); // {name: "Lee", getName: ƒ}
    return this.name;
  }
};
console.log(person.getName()); // Lee

function Person(name) 
{
  this.name = name;
  // 생성자 함수 내부에서 this는 생성자 함수가 생성할 인스턴스를 가리킨다.
  console.log(this); // Person {name: "Lee"}
}

const me = new Person('Lee');
```

엄격 모드일 경우 undefined가 바인딩

```javascript
function foo() 
{
  'use strict';

  console.log("foo's this: ", this);  // undefined
  function bar() 
  {
    console.log("bar's this: ", this); // undefined
  }
  bar();
}
foo();
```

일반 함수로 호출된 모든 함수(중첩, 콜백 함수 포함)내부의 this에는 전역 객체가 바인딩된다

그러나 중첩 함수 또는 콜백 함수를 일반함수로 사용하는 것은 문제가 생길 수 있다
this가 전역 객체를 참조하기때문

이를 해결할 수 있는 방법은 명시적으로 변수에 할당하거나 화살표 함수를 사용하는것이다

```javascript
var value = 1;

const obj = {
  value: 100,
  foo() 
  {
    // 화살표 함수 내부의 this는 상위 스코프의 this를 가리킨다.
    setTimeout(() => console.log(this.value), 100); // 100
  }
};

obj.foo();
```

## 메서드 호출

메서드 내부의 this는 메서드를 호출한 객체에 바인딩된다

```javascript
const person = {
  name: 'Lee',
  getName() {
    // 메서드 내부의 this는 메서드를 호출한 객체에 바인딩된다.
    return this.name;
  }
};

// 메서드 getName을 호출한 객체는 person이다.
console.log(person.getName()); // Lee
```

## 생성자 함수 호출

생성자 함수 내부의 this는 생성자 함수가 생성할 인스턴스에 바인딩된다

```javascript
// 생성자 함수
function Circle(radius) {
  // 생성자 함수 내부의 this는 생성자 함수가 생성할 인스턴스를 가리킨다.
  this.radius = radius;
  this.getDiameter = function () {
    return 2 * this.radius;
  };
}

// 반지름이 5인 Circle 객체를 생성
const circle1 = new Circle(5);
// 반지름이 10인 Circle 객체를 생성
const circle2 = new Circle(10);

console.log(circle1.getDiameter()); // 10
console.log(circle2.getDiameter()); // 20
// new 연산자와 함께 호출하지 않으면 생성자 함수로 동작하지 않는다. 즉, 일반적인 함수의 호출이다.
const circle3 = Circle(15);

// 일반 함수로 호출된 Circle에는 반환문이 없으므로 암묵적으로 undefined를 반환한다.
console.log(circle3); // undefined

// 일반 함수로 호출된 Circle 내부의 this는 전역 객체를 가리킨다.
console.log(radius); // 15
```

## 결론

- 일반 함수 호출
전역 객체에 바인딩
- 메서드 호출
메서드를 호출한 객체에 바인딩
- 생성자 함수 호출
생성자 함수가 생성할 인스턴스에 바인딩
- call / apply / bind
첫 번째 인수로 전달한 객체에 바인딩
