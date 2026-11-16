"""
================================================================================
DOOLALLY TAPROOM KHAR WEST — DISCRETE-EVENT & MONTE CARLO QUEUE ENGINE
================================================================================
Purpose:
    Companion Python discrete-event simulation (DES) and unit-economics engine
    for the Doolally Taproom Khar West 3D Digital Twin. Uses a pure standard-
    library `heapq` event scheduler (zero external dependencies) to run 100-run
    Monte Carlo validations across three operational scenarios:
      - Scenario 1: Manual Stairs Queue (Coarse wait info, rigid bench seating)
      - Scenario 2: FL-III Wait Lounge + Express Kiosk (Fine-grained SMS + 150ml tasters)
      - Scenario 3: Full Digital Twin + Smart Communal Seat-Gap Packing

Grounded Evidence Parameters:
    - Capacity: 48 communal bench seats (6 tables x 8 seats) + 8 bar stools = 56 seats
    - BMC Fire Code: 1m clear exit corridor (max 2 parties staged near stairs)
    - Maharashtra Excise FL-III: Red-ink permit lounge boundary (18 guest capacity)
    - Khar Pricing: ₹330/pint, ₹170-190/150ml taster, ₹1,500 meal for two
    - Journal of Travel Research (2025): Coarse vs. fine-grained wait renege decay
================================================================================
"""

from dataclasses import dataclass, field
import heapq
import json
import math
import random
import statistics
from typing import List, Dict, Optional


@dataclass(order=True)
class SimEvent:
    """Priority-queue event entry ordered strictly by simulation timestamp."""
    time_min: float
    priority: int
    kind: str = field(compare=False)
    party_id: Optional[int] = field(default=None, compare=False)


@dataclass
class GuestParty:
    """Represents a walking/waiting/seated party in the Khar 6F Taproom."""
    party_id: int
    pax: int
    arrival_min: float
    patience_min: float
    mug_club: bool
    has_lounge_order: bool = False
    lounge_spend_inr: float = 0.0
    dining_spend_inr: float = 0.0
    seated_min: Optional[float] = None
    reneged: bool = False


class DoolallyKharDES:
    """
    Event-driven simulator modeling Saturday peak evening hours (18:30 to 23:30,
    300 simulation minutes) at Doolally Taproom, Khar West, Mumbai.
    """

    def __init__(
        self,
        scenario: int = 3,
        mi_screening: bool = False,
        monsoon_surge: bool = False,
        seed: int = 42,
    ):
        self.scenario = scenario
        self.mi_screening = mi_screening
        self.monsoon_surge = monsoon_surge
        self.rng = random.Random(seed)

        # Physical capacity constraints
        self.num_tables = 5 if monsoon_surge else 6  # Balcony closed in monsoon
        self.seats_per_table = 8
        self.total_communal_seats = self.num_tables * self.seats_per_table
        self.table_occupancy: List[int] = [0] * self.num_tables

        # Simulation state
        self.clock: float = 0.0
        self.horizon_min: float = 300.0  # 5-hour Saturday peak window (18:30-23:30)
        self.event_queue: List[SimEvent] = []
        self.waitlist: List[GuestParty] = []
        self.parties: Dict[int, GuestParty] = {}
        self.next_id: int = 1

        # Telemetry accumulators
        self.bmc_spillover_minutes: float = 0.0
        self.last_bmc_check: float = 0.0
        self.keg_liters_poured: float = 0.0

    def _schedule(self, delay_min: float, kind: str, party_id: Optional[int] = None, priority: int = 1):
        heapq.heappush(self.event_queue, SimEvent(self.clock + delay_min, priority, kind, party_id))

    def _arrival_rate_per_hour(self) -> float:
        """Time-varying Saturday arrival rate (parties/hr) peaking at 20:30."""
        hour_offset = self.clock / 60.0
        # Bell curve around 20:30 (2.0 hours after 18:30)
        base = 24.0 + 14.0 * math.exp(-0.5 * ((hour_offset - 2.1) / 1.15) ** 2)
        if self.mi_screening:
            base *= 1.38  # +38% surge on Mumbai Indians match nights
        if self.monsoon_surge:
            base *= 1.12
        return base

    def _try_allocate_seats(self, party: GuestParty) -> Optional[int]:
        """
        Scenario 1 & 2: Rigid bench-block allocation (needs an empty 4-seat half-bench).
        Scenario 3: Smart Communal Seat-Gap Packing (packs open individual slots).
        """
        for idx, occ in enumerate(self.table_occupancy):
            free = self.seats_per_table - occ
            if self.scenario == 3:
                if free >= party.pax:
                    self.table_occupancy[idx] += party.pax
                    return idx
            else:
                # Rigid half-bench matching: requires at least 4 contiguous free seats
                if free >= 4 and party.pax <= 4:
                    self.table_occupancy[idx] += party.pax
                    return idx
        return None

    def _update_bmc_corridor_metric(self):
        elapsed = self.clock - self.last_bmc_check
        if elapsed > 0 and self.scenario == 1 and len(self.waitlist) >= 3:
            self.bmc_spillover_minutes += elapsed
        self.last_bmc_check = self.clock

    def run(self) -> Dict[str, float]:
        """Executes one complete 5-hour Saturday peak shift and returns KPIs."""
        # Seed initial seated diners at 18:30 (55% initial occupancy)
        for _ in range(8):
            p = GuestParty(
                party_id=self.next_id,
                pax=self.rng.choice([2, 3, 4]),
                arrival_min=0.0,
                patience_min=60.0,
                mug_club=self.rng.random() < 0.24,
            )
            self.next_id += 1
            t_idx = self._try_allocate_seats(p)
            if t_idx is not None:
                p.seated_min = 0.0
                p.dining_spend_inr = p.pax * 680.0
                self.parties[p.party_id] = p
                dwell = self.rng.uniform(45.0, 85.0)
                self._schedule(dwell, f"DEPART_TABLE_{t_idx}", p.party_id, priority=0)

        # Schedule first walk-in arrival
        self._schedule(1.5, "ARRIVAL")

        while self.event_queue:
            ev = heapq.heappop(self.event_queue)
            if ev.time_min > self.horizon_min:
                break
            self.clock = ev.time_min
            self._update_bmc_corridor_metric()

            if ev.kind == "ARRIVAL":
                # Schedule next Poisson arrival
                lam = self._arrival_rate_per_hour() / 60.0
                inter_arrival = self.rng.expovariate(lam)
                self._schedule(inter_arrival, "ARRIVAL")

                pax = self.rng.choices([2, 3, 4], weights=[0.48, 0.28, 0.24])[0]
                is_mug_club = self.rng.random() < 0.24

                # Behavioural Queue Theory (Journal of Travel Research, 2025):
                # Coarse wait info yields ~26 min patience; fine-grained SMS + lounge yields ~58 min
                base_patience = (
                    self.rng.uniform(20.0, 34.0)
                    if self.scenario == 1
                    else self.rng.uniform(46.0, 68.0)
                )

                party = GuestParty(
                    party_id=self.next_id,
                    pax=pax,
                    arrival_min=self.clock,
                    patience_min=base_patience,
                    mug_club=is_mug_club,
                )
                self.next_id += 1
                self.parties[party.party_id] = party

                # Check immediate seating
                t_idx = self._try_allocate_seats(party)
                if t_idx is not None:
                    self._seat_party(party, t_idx)
                else:
                    # Enter Waitlist (Stairs in S1 vs. FL-III Wait Lounge in S2/S3)
                    self.waitlist.append(party)
                    if self.scenario >= 2 and len(self.waitlist) <= 8:
                        # 72% Express Kiosk conversion for 150ml tasters & quick bites
                        if self.rng.random() < 0.72:
                            party.has_lounge_order = True
                            taster_price = self.rng.choice([170.0, 180.0, 185.0, 190.0])
                            snack_price = 240.0 if self.rng.random() < 0.52 else 0.0
                            party.lounge_spend_inr = (taster_price * pax) + snack_price
                            pour_liters = (0.225 if is_mug_club else 0.150) * pax
                            self.keg_liters_poured += pour_liters

                    # Schedule potential renege timeout
                    self._schedule(party.patience_min, "RENEGE_CHECK", party.party_id, priority=2)

            elif ev.kind == "RENEGE_CHECK":
                party = self.parties.get(ev.party_id)
                if party and party.seated_min is None and not party.reneged:
                    party.reneged = True
                    if party in self.waitlist:
                        self.waitlist.remove(party)

            elif ev.kind.startswith("DEPART_TABLE_"):
                t_idx = int(ev.kind.split("_")[-1])
                party = self.parties.get(ev.party_id)
                if party:
                    self.table_occupancy[t_idx] = max(0, self.table_occupancy[t_idx] - party.pax)
                # Greedily seat waiting parties into newly freed bench capacity
                self._drain_waitlist()

        return self._summarize_shift()

    def _seat_party(self, party: GuestParty, table_idx: int):
        party.seated_min = self.clock
        party.dining_spend_inr = party.pax * self.rng.uniform(640.0, 740.0)
        pour_liters = (0.50 if party.mug_club else 0.33) * party.pax * 1.8
        self.keg_liters_poured += pour_liters
        dwell = self.rng.uniform(80.0, 110.0) if self.mi_screening else self.rng.uniform(62.0, 88.0)
        self._schedule(dwell, f"DEPART_TABLE_{table_idx}", party.party_id, priority=0)

    def _drain_waitlist(self):
        remaining: List[GuestParty] = []
        for party in self.waitlist:
            if party.reneged:
                continue
            t_idx = self._try_allocate_seats(party)
            if t_idx is not None:
                self._seat_party(party, t_idx)
            else:
                remaining.append(party)
        self.waitlist = remaining

    def _summarize_shift(self) -> Dict[str, float]:
        arrived = [p for p in self.parties.values() if p.arrival_min > 0]
        seated = [p for p in arrived if p.seated_min is not None]
        reneged = [p for p in arrived if p.reneged]

        wait_times = [(p.seated_min - p.arrival_min) for p in seated if p.seated_min is not None]
        avg_wait = statistics.mean(wait_times) if wait_times else 0.0
        renege_rate = (len(reneged) / max(1, len(arrived))) * 100.0

        main_rev = sum(p.dining_spend_inr for p in self.parties.values() if p.seated_min is not None)
        lounge_rev = sum(p.lounge_spend_inr for p in arrived)
        gross_rev = main_rev + lounge_rev
        cogs = gross_rev * 0.26
        opex = 3400.0 if self.scenario == 1 else 4369.0
        net_profit = gross_rev - cogs - opex
        lost_walkaway_rev = sum(p.pax * 750.0 for p in reneged)

        return {
            "scenario": self.scenario,
            "total_walkin_parties": len(arrived),
            "seated_parties": len(seated),
            "avg_wait_min": round(avg_wait, 1),
            "walkaway_rate_pct": round(renege_rate, 1),
            "lounge_rev_inr": round(lounge_rev, 0),
            "gross_rev_inr": round(gross_rev, 0),
            "net_profit_inr": round(net_profit, 0),
            "lost_walkaway_rev_inr": round(lost_walkaway_rev, 0),
            "keg_liters_poured": round(self.keg_liters_poured, 1),
            "bmc_spillover_pct": round((self.bmc_spillover_minutes / self.horizon_min) * 100.0, 1),
        }


def run_monte_carlo_benchmark(runs: int = 100) -> Dict[str, Dict[str, float]]:
    """Runs 100-replication Monte Carlo comparison across Scenarios 1, 2, and 3."""
    summary = {}
    for scen in (1, 2, 3):
        results = [DoolallyKharDES(scenario=scen, seed=1000 + r).run() for r in range(runs)]
        summary[f"Scenario_{scen}"] = {
            "mean_avg_wait_min": round(statistics.mean(r["avg_wait_min"] for r in results), 1),
            "mean_walkaway_pct": round(statistics.mean(r["walkaway_rate_pct"] for r in results), 1),
            "mean_lounge_rev_inr": round(statistics.mean(r["lounge_rev_inr"] for r in results), 0),
            "mean_net_profit_inr": round(statistics.mean(r["net_profit_inr"] for r in results), 0),
            "mean_lost_walkaway_inr": round(statistics.mean(r["lost_walkaway_rev_inr"] for r in results), 0),
            "mean_bmc_spillover_pct": round(statistics.mean(r["bmc_spillover_pct"] for r in results), 1),
        }
    return summary


if __name__ == "__main__":
    print("=== DOOLALLY TAPROOM KHAR WEST — 100-RUN MONTE CARLO CALIBRATION ===")
    benchmark = run_monte_carlo_benchmark(runs=100)
    print(json.dumps(benchmark, indent=2))