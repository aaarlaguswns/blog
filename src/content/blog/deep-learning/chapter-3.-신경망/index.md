---
title: Chapter 3. 신경망
description: "--- publish: true title: Chapter 3. 신경망 description: 과제 tags: Python --"
date: 2026-09-20T06:50:10.635Z
source: obsidian
draft: true
---

![](<./assets/images-kimkihoon0515-post-41f70d57-3a89-4228-b60e-2412befdf960-image 4.png>)---
publish: true
title: Chapter 3. 신경망
description: 과제
tags:
  - Python
---
## 3 - 1. 퍼셉트론에서 신경망으로

퍼셉트론은 복잡한 함수도 표현할 수 있지만 가중치를 설정하는 작업은 여전히 사람이 수동으로 한다는 단점이 존재한다. 하지만 신경망은 가중치 매개변수의 적절한 값을 데이터로부터 자동으로 학습하는 능력을 갖추고 있다

![](./assets/images-kimkihoon0515-post-10418242-5204-4ded-8d5a-023505991d64-image.png)

왼쪽 줄을 입력층, 중간 줄을 은닉층, 오른쪽 줄을 출력층이라고 한다

은닉층이라 부르는 이유는 사람의 눈에 직접적으로 보이지 않는 부분이기 때문이다

위에 그림 3-1은 앞 장에서 본 퍼셉트론과 크게 달라 보이지 않는다. 실제로 뉴런의 연결 방식은 달라진것이 없다 다만 신호를 전달하는 방법에서 차이가 발생한다.

## 3 - 2. 활성화 함수

활성화 함수란 입력 신호의 총합이 활성화를 일으키는지를 정하는 역할을 한다. 활성화 함수가 필요한 이유는 모델의 복잡도를 올리기 위함인데 비선형 문제를 해결하는데 중요한 역할을 한다,
비선형 문제를 해결하기 위해 단층 퍼셉트론을 쌓는 방법을 이용헀는데 은닉층을 무작정 쌓기만 한다고해서 비선형문제를 해결할 수 있는것은 아니다. 활성 함수를 사용하면 입력값에 대한 출력값이 비선형적으로 나오므로 선형분류기를 비선형분류기로도 만들 수 있다.

![](<./assets/R1280x0-7 1.png>)

## 3 - 2 - 1. 시그모이드 함수

신경망에서는 가중치를 학습시키는데 있어 미분을 사용해야했기 때문에 활성화 함수로 계단함수를 사용할 수 없었다. 또한 계단함수는 0과 1과 같은 극단적인 값을 전달하기 때문에 데이터의 정보를 손실시켰다, 따라서 계단함수를 곡선의 형태로 변형시킨 형태의 시그모이드 함수를 적용하게 되었다. 시그모이드는 우리가 흔히 알고 있는 로지스틱 함수이다.

![](<./assets/R1280x0-8 1.png>)

## 3 - 2 - 2. 함수 구현하기

시그모이드 함수구현

```python
import numpy as np
import matplotlib.pylab as plt

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

x = np.arange(-5.0,5.0,0.1)
y = sigmoid(x)
plt.plot(x, y)
plt.ylim(-0.1, 1.1)
plt.show()
```

![](<./assets/images-kimkihoon0515-post-e8ec0243-6a3e-4de1-b538-acd0678f725a-image 1.png>)

시그모이드 함수와 계단 함수를 비교해보면 가장 눈에 띄는 차이는 '매끄러움'의 차이이다 시그모이드 함수는 부드러운 곡선이고 입력에 따라 출력이 연속적으로 변화한다. 계단함수는 0을 경계로 출력이 갑자기 바뀌어버린다.

## 3 - 2 - 3. ReLU 함수

최근에 주로 사용되는 ReLU함수이다 입력이 0을 넘으면 그 입력을 그래도 출력하고, 0이하이면 0을 출력하는 함수이다.

![](<./assets/images-kimkihoon0515-post-36ad8584-71a4-46d5-b60e-98ef7d1a4e29-image 1.png>)

## 3 - 3. 3층 신경망 구현하기

![](<./assets/images-kimkihoon0515-post-2503790e-ba66-4165-a491-2c6630421f99-image 1.png>)

넘파이 행렬을 통해 신경망을 구현

코드로 나타내면 다음과 같다

```python
import numpy as np

X = np.array([1,2])
W = np.array([[1,3,5],[2,4,6]])
Y = np.dot(X,W) # 행렬의 곱
print(Y)
```

이를 기반으로 입력층에서 1층으로 신호가 전달되는 것을 그림으로 나타냄

![](<./assets/images-kimkihoon0515-post-d86d384d-69f7-46bf-ad7b-ecf8705ce245-image 1.png>)

1층의 a를 식으로 나타내면 아래와 같다

![](<./assets/images-kimkihoon0515-post-8cfdb23a-b277-4fde-b0b3-c63b9c648663-image 1.png>)

행렬의 곱을 이용하여 1층의 가중치 부분을 간소화 할수 있고 행렬을 각각 정리해보면

![](<./assets/images-kimkihoon0515-post-41f70d57-3a89-4228-b60e-2412befdf960-image 5.png>)
