---
title: Binary Search 2805
description: C++ 코드
date: 2025-12-06T10:38:09.000Z
---

```cpp
//2805  파라메트릭 서치
//나무 자르기 - 절단기의 높이 설정    h를 올리면 남은 길이가 줄어듬 그래서 문제는 [정해진 남은길이 이상, h의 높이구하기]
#include <bits/stdc++.h>
#define fIO ios_base::sync_with_stdio(false); \
cin.tie(NULL);
using namespace std;

int n;
long long m;
vector<int> tree;

bool is_possible(int h)
{
    long long sum = 0;
    for(int i = 0; i < n; i++)
    {
        if(tree[i] > h)
            sum += (tree[i]- h);
    }
    return sum >= m;
}
int main(void)
{
    fIO
    cin >> n >> m;
    tree.resize(n);
    for(int i = 0; i < n; i++)
    {
        cin >> tree[i];
    }

    int left = 0, right = *max_element(tree.begin(), tree.end());
    int answer = 0;

    while(left <= right)
    {
        int mid = (left + right) / 2;
        if(is_possible(mid))
        {
            answer = mid;
            left = mid + 1;
        }
        else
        {
            right = mid - 1;
        }
    }

    cout << answer << "\n";

}
```
