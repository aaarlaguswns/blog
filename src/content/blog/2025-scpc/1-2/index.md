---
title: 2025 SCPC 1-2
description: C++ 코드
date: 2025-12-06T10:38:09.000Z
source: obsidian
---

```cpp
#include <bits/stdc++.h>
#define fIO ios_base::sync_with_stdio(false); \
cin.tie(NULL);
using namespace std;

// 잔돈 4,500원을 줄 수 있는지 판단하는 함수
bool giveChange(int& coin500, int& coin1000) 
{
    int change = 4500;

    // 큰 단위(1000원)부터 최대한 사용
    int use1000 = min(change / 1000, coin1000);
    change -= use1000 * 1000;
    coin1000 -= use1000;

    // 나머지를 500원짜리로
    int use500 = min(change / 500, coin500);
    change -= use500 * 500;
    coin500 -= use500;

    // 잔돈을 줄 수 있으면 true, 아니면 false
    if (change == 0) return true;

    // 실패하면 복구
    coin1000 += use1000;
    coin500 += use500;
    return false;
}

int main() 
{
    fIO
    int T; // 테스트 케이스 수
    cin >> T;

    for (int case_num = 1; case_num <= T; ++case_num) 
    {
        int n;
        cin >> n;
        vector<int> customers(n);

        for (int i = 0; i < n; ++i) 
        {
            cin >> customers[i];
        }

        int coin500 = 0, coin1000 = 0; // 철수의 보유 금액
        int sold = 0;                  // 판매 성공 수

        for (int i = 0; i < n; ++i) 
        {
            int pay = customers[i];      // 손님이 낸 돈

            if (pay == 500) 
            {
                coin500++;
            }
            else if (pay == 1000)        // 손님이 낸 돈이 1000이면
            {
                if (coin500 >= 1)        // 500동전이 1개 이상일 때 500과 1000 교환
                {
                    coin500--;
                    coin1000++;
                } else 
                {
                    break;
                }
            }
            else if (pay == 5000)        // 손님이 낸 돈이 5000이면 
            {
                if (!giveChange(coin500, coin1000)) 
                {
                    break;
                }
            }
            sold++;
        }

        cout << "Case #" << case_num << endl << sold << endl;
    }

    return 0;
}
```
