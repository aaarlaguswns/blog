---
title: Back Tracking 15654
description: C++ 코드
date: 2025-12-06T10:38:09.000Z
tags:
  - C++
source: obsidian
---

```cpp
//(1)번에서 1부터 n이 아니라 사용자가 입력한 배열을 사용함

#include <bits/stdc++.h>
#define fIO ios_base::sync_with_stdio(false); \
cin.tie(NULL);
using namespace std;

vector<int> a;
vector<int> answer;
vector<bool> check;     //a[i]를 썼는지 체크

int n, m;

void recursion(int count)
{
    if(count == m)
    {
        for(int i = 0; i < m; i++)
        {
            cout << answer[i] << " ";
        }
        cout << "\n";
        return;
    }

    for(int i = 0; i < n; i++)
    {
        if(!check[i])
        {
            check[i] = true;
            answer.push_back(a[i]);     // i번쨰 선택
            recursion(count + 1); // i로 시작하는 경우들 탐색끝내고 돌아옴
            check[i] = false;
            answer.pop_back();       // i선택 취소
        }
    }
}

int main()
{
    cin >> n >> m;

    a.resize(n);
    check.resize(n, false);
    for(int i = 0; i < n; i++)
    {
        cin >> a[i];
    }

    sort(a.begin(), a.end());

    recursion(0);
    return 0;

}
```
