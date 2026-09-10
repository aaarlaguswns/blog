---
title: 2025 SCPC 1-1
description: C++ 코드
date: 2025-12-06T10:38:09.000Z
tags:
  - C++
source: obsidian
---

```cpp
#include <bits/stdc++.h>
using namespace std;

int main()
{
    int T;        //테스트 케이스의 갯수
    cin >> T;
    for (int case_num = 1; case_num <= T; ++case_num) 
    {
        int n;    //손님 수
        cin >> n;
        vector<int> customers(n);  //손님이 낸 금액
        for (int i = 0; i < n; ++i) 
        {
            cin >> customers[i];
        }

        int cnt500 = 0, cnt1000 = 0;      //철수가 가지고 있는 500, 1000의 갯수
        int sold = 0;                     //지금까지 판 손님 수

        for (int i = 0; i < n; ++i) 
        {
            int pay = customers[i];       //손님이 낸 돈
            if (pay == 500)               //손님이 낸 돈이 500원이라면
            {
                cnt500++;                 //cnt500 +1
            } else if (pay == 1000)       //손님이 낸 돈이 1000원이라면
            {
                if (cnt500 >= 1)          //500동전을 1개 이상가졌다면 1000과 교환
                {
                    cnt500--;
                    cnt1000++;
                } else break;             //500동전이 없다면 종료
            } else if (pay == 5000)       //손님이 5000을 낸다면 -> 잔돈이 4500원 필요
            {
                if (cnt1000 >= 3 && cnt500 >= 0) 
                {
                    cnt1000 -= 3;
                } 
                else if (cnt1000 >= 2 && cnt500 >= 5) 
                {
                     cnt1000 -= 2;
                     cnt500 -= 5;
                } 
                else if (cnt1000 >= 1 && cnt500 >= 7) 
                {
                    cnt1000 -= 1;
                    cnt500 -= 7;
                } 
                else if (cnt500 >= 9) 
                {
                    cnt500 -= 9;
                } 
                else 
                {
                    break;  // 잔돈 부족
                }
            }
            sold++;
        }

        cout << "Case #" << case_num << endl << sold << endl;
    }
    return 0;
}
```
