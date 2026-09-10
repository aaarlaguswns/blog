---
title: Back Tracking 15649
description: C++ 코드
date: 2025-12-06T10:38:09.000Z
tags:
  - C++
source: obsidian
---

```cpp
//1부터 n까지 길이가 m인 가능한 모든 수열

#include <bits/stdc++.h>
#define fIO ios_base::sync_with_stdio(false); \
cin.tie(NULL);
using namespace std;

vector<int> answer;
vector<bool> check;
int n, m;
void recursion(int m, int count)    // 뽑아야 할 숫자의 개수, 지금까지 뽑은 숫자의 개수(현재 수열의 길이)
{                                              // 중복을 피하고 나보다 높은 숫자만 고르도록
    if(count == m)    //m개를 다 선택했다면 출력
    {
        for(int i = 0; i < m; i++)
        {
            cout << answer[i] << " ";
        }
        cout << "\n";
        return;
    }

    for(int i = 1; i <= n; i++)
    {
        if(!check[i])
        {
            check[i] = true;
            answer.push_back(i);     // i번쨰 선택
            recursion(m, count + 1); // i로 시작하는 경우들 탐색끝내고 돌아옴
            check[i] = false;        // 재사용
            answer.pop_back();       // i선택 취소
        }
    }
}

int main()
{
    fIO
    cin >> n >> m;
    check.resize(n+1, false);
    recursion(m, 0);

    return 0;
}
```
