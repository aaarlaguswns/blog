---
title: NYPC 1-3
description: Python 코드
date: 2025-12-06T10:38:09.000Z
source: obsidian
---

```py
#7승   현 가장 좋은 코드

from enum import Enum
from dataclasses import dataclass
from typing import List, Optional, Tuple
from collections import Counter
from itertools import combinations
import sys
import random

class DiceRule(Enum):
    ONE = 0; TWO = 1; THREE = 2; FOUR = 3; FIVE = 4; SIX = 5
    CHOICE = 6; FOUR_OF_A_KIND = 7; FULL_HOUSE = 8; SMALL_STRAIGHT = 9; LARGE_STRAIGHT = 10; YACHT = 11

@dataclass
class Bid:
    group: str
    amount: int

@dataclass
class DicePut:
    rule: DiceRule
    dice: List[int]

class Game:
    def __init__(self):
        self.my_state = GameState()
        self.opp_state = GameState()
        self.round = 0
        self.opp_bid_history: List[int] = []

    def calculate_bid(self, dice_a: List[int], dice_b: List[int]) -> Bid:
        self.round += 1
        
        potential_a = self.my_state.calculate_best_put(self.round, dice_a)[0]
        potential_b = self.my_state.calculate_best_put(self.round, dice_b)[0]
        chosen_group = "A" if potential_a > potential_b else "B"

        # 상대 최근 배팅 평균 (최근 5턴)
        recent_bids = self.opp_bid_history[-5:] if len(self.opp_bid_history) >= 5 else self.opp_bid_history
        opp_avg = sum(recent_bids) / len(recent_bids) if recent_bids else 0

        base_bid = 5   # 최소 배팅 금액 (0보다 좀 더 공격적으로)
        max_bid = 49999

        if self.round <= 5:
            # 초반 공격적 배팅: 기본 점수 차이를 1000으로 나눠서 배팅금액 산정
            diff = potential_a - potential_b
            my_bid = max(base_bid, int(diff / 1000))
        else:
            # 중후반 상대 공격적이면 수비적, 아니면 공격적
            if opp_avg > 20:  # 상대 공격성 판단 임계값 예시
                my_bid = max(base_bid, int(opp_avg * 0.5))  # 수비적 배팅
            else:
                my_bid = max(base_bid, int(opp_avg * 1.2))  # 공격적 배팅

        # 배팅 금액 범위 제한
        my_bid = min(max_bid, my_bid)

        return Bid(chosen_group, my_bid)

    def calculate_put(self) -> DicePut:
        _, best_rule, best_dice_put = self.my_state.calculate_best_put(self.round, [])
        return DicePut(best_rule, best_dice_put)
    
    def update_get(self, dice_a: List[int], dice_b: List[int], my_bid: Bid, opp_bid: Bid, my_group: str):
        self.opp_bid_history.append(opp_bid.amount)
        if my_group == "A":
            self.my_state.add_dice(dice_a)
            self.opp_state.add_dice(dice_b)
        else:
            self.my_state.add_dice(dice_b)
            self.opp_state.add_dice(dice_a)
        my_bid_ok = my_bid.group == my_group
        self.my_state.bid(my_bid_ok, my_bid.amount)
        opp_group = "B" if my_group == "A" else "A"
        opp_bid_ok = opp_bid.group == opp_group
        self.opp_state.bid(opp_bid_ok, opp_bid.amount)

    def update_put(self, put: DicePut):
        self.my_state.use_dice(put)

    def update_set(self, put: DicePut):
        self.opp_state.use_dice(put)

class GameState:
    def __init__(self):
        self.dice = []
        self.rule_score: List[Optional[int]] = [None] * 12
        self.bid_score = 0

    def get_total_score(self) -> int:
        basic = sum(s for s in self.rule_score[0:6] if s is not None)
        bonus = 35000 if basic >= 63000 else 0
        combination = sum(s for s in self.rule_score[6:12] if s is not None)
        return basic + bonus + combination + self.bid_score
        
    def bid(self, is_successful: bool, amount: int):
        self.bid_score += -amount if is_successful else amount

    def add_dice(self, new_dice: List[int]):
        self.dice.extend(new_dice)

    def use_dice(self, put: DicePut):
        if put.rule is None or self.rule_score[put.rule.value] is not None:
            fallback_rule_val = next((i for i, s in enumerate(self.rule_score) if s is None), 6)
            put.rule = DiceRule(fallback_rule_val)
        for d in put.dice: 
            if d in self.dice:
                self.dice.remove(d)
        self.rule_score[put.rule.value] = self.calculate_score(put)

    def calculate_best_put(self, round_num: int, new_dice: List[int]) -> Tuple[int, DiceRule, List[int]]:
        current_dice = sorted(self.dice + new_dice)
        if len(current_dice) < 5:
            dice_put = current_dice + [1] * (5 - len(current_dice))
            rule_val = next((i for i, s in enumerate(self.rule_score) if s is None), 6)
            return -1, DiceRule(rule_val), dice_put

        # YACHT 우선
        if self.rule_score[DiceRule.YACHT.value] is None:
            counts = Counter(current_dice)
            yacht_num = next((num for num, count in counts.items() if count >= 5), None)
            if yacht_num:
                yacht_dice = [yacht_num] * 5
                put = DicePut(DiceRule.YACHT, yacht_dice)
                score = self.calculate_score(put)
                if score > 0:
                    return score, DiceRule.YACHT, yacht_dice

        best_total_score = -99999
        best_rule = None
        best_dice_put = []
        potential_moves = []
        for rule in DiceRule:
            if self.rule_score[rule.value] is None:
                for dice_combination_tuple in combinations(current_dice, 5):
                    dice_combo = list(dice_combination_tuple)
                    put = DicePut(rule, dice_combo)
                    immediate_score = self.calculate_score(put)
                    strategic_bonus = 0
                    counts = Counter(dice_combo)

                    if rule.value <= 5:
                        if dice_combo.count(rule.value + 1) < 3: 
                            continue
                        strategic_bonus += immediate_score * 1.2
                    
                    four_of_a_kind_num = next((num for num, count in counts.items() if count >= 4), None)
                    if four_of_a_kind_num and self.rule_score[four_of_a_kind_num-1] is None and rule.value == four_of_a_kind_num - 1:
                        strategic_bonus += 30000

                    total_score = immediate_score + strategic_bonus

                    if round_num >= 11:
                        total_score += self._next_turn_consideration(rule, dice_combo)

                    potential_moves.append((total_score, rule, dice_combo))
        
        if potential_moves:
            best_total_score, best_rule, best_dice_put = max(potential_moves, key=lambda x: x[0])
        
        if best_total_score < 7000:
            available_trash_rules = [r for r in [DiceRule.CHOICE, DiceRule.ONE] if self.rule_score[r.value] is None]
            if available_trash_rules:
                best_rule = available_trash_rules[0]
                best_dice_put = min(combinations(current_dice, 5), key=sum)

        if best_rule is None:
            best_rule = DiceRule(next((i for i, s in enumerate(self.rule_score) if s is None), 6))
        if not best_dice_put:
            best_dice_put = current_dice[:5]

        return best_total_score, best_rule, list(best_dice_put)

    def _next_turn_consideration(self, current_rule: DiceRule, dice_combo: List[int]) -> int:
        remaining_rules = [i for i, s in enumerate(self.rule_score) if s is None and i != current_rule.value]
        penalty = 0
        for r in remaining_rules:
            if r <= 5:
                if (r + 1) in dice_combo:
                    penalty -= 5000
        return penalty

    @staticmethod
    def calculate_score(put: DicePut) -> int:
        rule, dice = put.rule, sorted(put.dice)
        counts = Counter(dice)

        if rule.value <= 5:
            return dice.count(rule.value + 1) * (rule.value + 1) * 1000
        if rule == DiceRule.CHOICE:
            return sum(dice) * 1000
        if rule == DiceRule.FOUR_OF_A_KIND and any(c >= 4 for c in counts.values()):
            return sum(dice) * 1000
        if rule == DiceRule.FULL_HOUSE and sorted(counts.values()) in [[2, 3], [5]]:
            return sum(dice) * 1000
        if rule == DiceRule.SMALL_STRAIGHT:
            s = "".join(map(str, sorted(set(dice))))
            if "1234" in s or "2345" in s or "3456" in s:
                return 15000
        if rule == DiceRule.LARGE_STRAIGHT:
            if "12345" in "".join(map(str, dice)) or "23456" in "".join(map(str, dice)):
                return 30000
        if rule == DiceRule.YACHT and 5 in counts.values():
            return 50000
        return 0

def main():
    game = Game()
    dice_a, dice_b = [0] * 5, [0] * 5
    my_bid = Bid("", 0)
    while True:
        try:
            line = input().strip()
            if not line:
                continue
            command, *args = line.split()
            if command == "READY":
                print("OK")
            elif command == "ROLL":
                str_a, str_b = args
                for i, c in enumerate(str_a):
                    dice_a[i] = int(c)
                for i, c in enumerate(str_b):
                    dice_b[i] = int(c)
                my_bid = game.calculate_bid(dice_a, dice_b)
                print(f"BID {my_bid.group} {my_bid.amount}")
            elif command == "GET":
                get_group, opp_group, opp_score = args
                game.update_get(dice_a, dice_b, my_bid, Bid(opp_group, int(opp_score)), get_group)
            elif command == "SCORE":
                put = game.calculate_put()
                game.update_put(put)
                print(f"PUT {put.rule.name} {''.join(map(str, put.dice))}")
            elif command == "SET":
                rule, str_dice = args
                dice = [int(c) for c in str_dice]
                game.update_set(DicePut(DiceRule[rule], dice))
            elif command == "FINISH":
                break
        except EOFError:
            break

if __name__ == "__main__":
    main()
```
