---
title: Back Tracking 9663 - N-Queen
description: C++ 코드
date: 2025-12-06T10:38:09.000Z
source: obsidian
---

```cpp
//N-Queen
//row 행
//col 열

#include <bits/stdc++.h>
using namespace std;

int n;
int result = 0;
vector<int> queen;   //i번째 행의 열의 위치

bool isvalid(int row, int col)    //놔도 되는지 검사하는 함수
{
    for(int i = 0; i < row; i++)   //같은 열, 같은 대각선은 false
    {
        if(queen[i] == col || abs(queen[i] - col) == abs(i - row))  
        {
            return false;
        } 
    }
    return true;
}

void recursion(int row)
{
    if(row == n)       //종료조건   n줄 모두 퀸을 놓았다
    {
        result++;
        return;
    }

    for(int col = 0; col < n; col++)    //현재 행에서 가능한 모든 열을 탐색
    {
        if(isvalid(row, col))           //놓을수 있다면(가능한 열이라면), 안된다면 col++
        {
            queen[row] = col;           //퀸을 row행에 col열에 놓음(기록)
            recursion(row + 1);         //재귀호출
        }
    }
}

int main()
{
    cin >> n;
    queen.resize(n);
    recursion(0);
    cout << result << endl;

    return 0;
}
```
