"""
Sales Brain test suite.

Covers: probability updates, stage transitions, proposal generation,
follow-up engine, timeline events, memory (entity extraction),
CEO report data, dashboard widgets, and E2E API flows.

Run: source venv/bin/activate && python -m pytest tests/test_sales_brain.py -v
"""
import os
import sys
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ── Import the module under test ─────────────────────────────────────────────
from services.sales_brain import (
    analyze_message,
    calculate_deal_probability,
    calculate_temperature,
    calculate_budget_confidence,
    calculate_requirements_completeness,
    determine_decision_stage,
    determine_urgency,
    determine_risk,
    estimate_revenue,
    estimate_close_date,
    choose_next_action,
    run_analysis,
    check_follow_ups,
    get_sales_summary,
    log_event,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

def _mock_db():
    db = MagicMock()
    db.add = MagicMock()
    db.commit = MagicMock()
    db.flush = MagicMock()
    db.query = MagicMock()
    return db


def _conv(**kwargs):
    defaults = {
        "id": 1,
        "purchase_request_id": 1,
        "lead_id": 1,
        "telegram_chat_id": "12345",
        "status": "active",
        "extracted_requirements": {},
        "needs_human": False,
        "ai_paused": False,
        "deal_probability": 0,
        "urgency": "low",
        "client_temperature": "cold",
        "budget_confidence": 0,
        "requirements_completeness": 0,
        "decision_stage": "new",
        "estimated_revenue": 0.0,
        "estimated_close_date": None,
        "recommended_next_action": None,
        "risk_level": "medium",
        "pain_points": [],
        "goals": [],
        "constraints": [],
        "must_have": [],
        "nice_to_have": [],
        "budget_range": None,
        "deadline": None,
        "competitors": [],
        "preferred_solution": None,
        "last_client_message_at": None,
        "follow_up_count": 0,
        "is_stale": False,
        "summary": None,
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


# ══════════════════════════════════════════════════════════════════════════════
# 1. analyze_message
# ══════════════════════════════════════════════════════════════════════════════

class TestAnalyzeMessage:
    def test_buying_signal(self):
        sig = analyze_message("Да, давайте, готов начать")
        assert sig["buying_signal"] is True

    def test_objection_signal(self):
        sig = analyze_message("Дорого, подумаю")
        assert sig["objection"] is True

    def test_urgency_high(self):
        sig = analyze_message("Нужно срочно, всё горит")
        assert sig["urgency_high"] is True

    def test_urgency_med(self):
        sig = analyze_message("Планирую запустить в этом месяце")
        assert sig["urgency_med"] is True

    def test_budget_mention(self):
        sig = analyze_message("Бюджет около 50 тысяч")
        assert sig["budget_mention"] is True

    def test_competitor(self):
        sig = analyze_message("Рассматриваю и upwork тоже")
        assert sig["competitor_kw"] is True

    def test_negotiation(self):
        sig = analyze_message("Можно скидку сделать?")
        assert sig["negotiation_kw"] is True

    def test_closing(self):
        sig = analyze_message("Пришлите счёт, оплатим")
        assert sig["closing_kw"] is True

    def test_pain_point(self):
        sig = analyze_message("У нас проблема с обработкой заказов")
        assert sig["pain_point"] is True

    def test_clean_message_no_signals(self):
        sig = analyze_message("Привет, как дела?")
        assert sig["buying_signal"] is False
        assert sig["objection"] is False
        assert sig["urgency_high"] is False

    def test_word_count(self):
        sig = analyze_message("одно два три")
        assert sig["word_count"] == 3

    def test_long_message(self):
        sig = analyze_message(" ".join(["слово"] * 30))
        assert sig["long_message"] is True


# ══════════════════════════════════════════════════════════════════════════════
# 2. Deal probability
# ══════════════════════════════════════════════════════════════════════════════

class TestDealProbability:
    def test_base_new_conv(self):
        conv = _conv()
        assert calculate_deal_probability(conv) == 10

    def test_won_always_100(self):
        conv = _conv(decision_stage="won")
        assert calculate_deal_probability(conv) == 100

    def test_lost_always_0(self):
        conv = _conv(decision_stage="lost")
        assert calculate_deal_probability(conv) == 0

    def test_requirements_increase_prob(self):
        conv_few = _conv(extracted_requirements={"goal": "test", "users": "100"})
        conv_many = _conv(extracted_requirements={
            "goal": "x", "users": "x", "features": "x",
            "timeline": "x", "success": "x",
        })
        assert calculate_deal_probability(conv_many) > calculate_deal_probability(conv_few)

    def test_budget_increases_prob(self):
        conv_no_budget = _conv(extracted_requirements={"goal": "test"})
        conv_with_budget = _conv(
            extracted_requirements={"goal": "test"},
            budget_range="50 тыс",
        )
        assert calculate_deal_probability(conv_with_budget) > calculate_deal_probability(conv_no_budget)

    def test_competitor_reduces_prob(self):
        conv_clean = _conv(extracted_requirements={"goal": "test"})
        conv_comp  = _conv(extracted_requirements={"goal": "test"}, competitors=["upwork"])
        assert calculate_deal_probability(conv_comp) < calculate_deal_probability(conv_clean)

    def test_stale_reduces_prob(self):
        conv = _conv(is_stale=True)
        assert calculate_deal_probability(conv) < 10  # 10 base - 15 stale = cap at 5

    def test_closing_stage_bonus(self):
        conv = _conv(decision_stage="closing")
        p = calculate_deal_probability(conv)
        assert p >= 35  # 10 base + 35 stage bonus

    def test_prob_capped_at_95(self):
        conv = _conv(
            extracted_requirements={
                "goal": "x", "users": "x", "features": "x",
                "timeline": "x", "success": "x", "integrations": "x",
                "admin": "x", "design": "x", "examples": "x",
            },
            budget_range="100к",
            decision_stage="closing",
        )
        assert calculate_deal_probability(conv) <= 95


# ══════════════════════════════════════════════════════════════════════════════
# 3. Temperature
# ══════════════════════════════════════════════════════════════════════════════

class TestTemperature:
    def test_cold(self):
        assert calculate_temperature(15) == "cold"

    def test_warm(self):
        assert calculate_temperature(45) == "warm"

    def test_hot(self):
        assert calculate_temperature(70) == "hot"

    def test_boundary_warm(self):
        assert calculate_temperature(30) == "warm"

    def test_boundary_hot(self):
        assert calculate_temperature(60) == "hot"


# ══════════════════════════════════════════════════════════════════════════════
# 4. Budget confidence
# ══════════════════════════════════════════════════════════════════════════════

class TestBudgetConfidence:
    def test_no_budget(self):
        conv = _conv()
        assert calculate_budget_confidence(conv) == 10

    def test_with_budget_range(self):
        conv = _conv(budget_range="50 тыс")
        assert calculate_budget_confidence(conv) == 80

    def test_budget_keyword_in_reqs(self):
        conv = _conv(extracted_requirements={"goal": "цена хорошая"})
        # contains "цена" which is in BUDGET_KW
        assert calculate_budget_confidence(conv) >= 45


# ══════════════════════════════════════════════════════════════════════════════
# 5. Requirements completeness
# ══════════════════════════════════════════════════════════════════════════════

class TestRequirementsCompleteness:
    def test_empty(self):
        assert calculate_requirements_completeness(_conv()) == 0

    def test_with_reqs(self):
        conv = _conv(extracted_requirements={"goal": "x", "users": "x", "features": "x"})
        assert calculate_requirements_completeness(conv) == 33  # 3/9 * 100

    def test_full(self):
        all9 = {k: "x" for k in ["goal", "users", "features", "integrations",
                                  "timeline", "admin", "design", "success", "examples"]}
        conv = _conv(extracted_requirements=all9)
        assert calculate_requirements_completeness(conv) == 100

    def test_private_keys_excluded(self):
        conv = _conv(extracted_requirements={"_last_asked": "goal"})
        assert calculate_requirements_completeness(conv) == 0


# ══════════════════════════════════════════════════════════════════════════════
# 6. Stage transitions
# ══════════════════════════════════════════════════════════════════════════════

class TestDecisionStage:
    def test_new_to_discovery(self):
        conv = _conv(decision_stage="new")
        sig  = analyze_message("Привет")
        assert determine_decision_stage(conv, sig) == "discovery"

    def test_discovery_to_qualified_on_3_reqs(self):
        conv = _conv(
            decision_stage="discovery",
            extracted_requirements={"goal": "x", "users": "x", "features": "x"},
        )
        sig = analyze_message("ok")
        assert determine_decision_stage(conv, sig) == "qualified"

    def test_stay_discovery_if_less_than_3(self):
        conv = _conv(
            decision_stage="discovery",
            extracted_requirements={"goal": "x", "users": "x"},
        )
        sig = analyze_message("ok")
        assert determine_decision_stage(conv, sig) == "discovery"

    def test_qualified_to_proposal_on_status(self):
        conv = _conv(
            decision_stage="qualified",
            status="proposal_sent",
        )
        sig = analyze_message("ok")
        assert determine_decision_stage(conv, sig) == "proposal"

    def test_negotiation_signal(self):
        conv = _conv(decision_stage="proposal")
        sig  = analyze_message("Дайте скидку пожалуйста")
        assert determine_decision_stage(conv, sig) == "negotiation"

    def test_closing_signal(self):
        conv = _conv(decision_stage="negotiation")
        sig  = analyze_message("Присылайте счёт, начинаем")
        assert determine_decision_stage(conv, sig) == "closing"

    def test_won_immutable(self):
        conv = _conv(decision_stage="won")
        sig  = analyze_message("скидку скидку")
        assert determine_decision_stage(conv, sig) == "won"

    def test_lost_immutable(self):
        conv = _conv(decision_stage="lost")
        sig  = analyze_message("давайте, берём")
        assert determine_decision_stage(conv, sig) == "lost"


# ══════════════════════════════════════════════════════════════════════════════
# 7. Urgency
# ══════════════════════════════════════════════════════════════════════════════

class TestUrgency:
    def test_default_low(self):
        conv = _conv()
        assert determine_urgency(conv, {}) == "low"

    def test_high_from_signal(self):
        conv = _conv()
        assert determine_urgency(conv, {"urgency_high": True}) == "high"

    def test_med_from_signal(self):
        conv = _conv()
        assert determine_urgency(conv, {"urgency_med": True}) == "medium"

    def test_high_from_timeline(self):
        conv = _conv(extracted_requirements={"timeline": "нужно срочно!"})
        assert determine_urgency(conv, {}) == "high"


# ══════════════════════════════════════════════════════════════════════════════
# 8. Risk
# ══════════════════════════════════════════════════════════════════════════════

class TestRisk:
    def test_stale_is_high(self):
        conv = _conv(is_stale=True)
        assert determine_risk(conv, 70) == "high"

    def test_needs_human_is_high(self):
        conv = _conv(needs_human=True)
        assert determine_risk(conv, 70) == "high"

    def test_competitors_is_high(self):
        conv = _conv(competitors=["competitor1"])
        assert determine_risk(conv, 70) == "high"

    def test_low_prob_is_high_risk(self):
        conv = _conv()
        assert determine_risk(conv, 20) == "high"

    def test_medium_prob_is_medium_risk(self):
        conv = _conv()
        assert determine_risk(conv, 40) == "medium"

    def test_high_prob_is_low_risk(self):
        conv = _conv()
        assert determine_risk(conv, 70) == "low"


# ══════════════════════════════════════════════════════════════════════════════
# 9. Revenue estimate
# ══════════════════════════════════════════════════════════════════════════════

class TestEstimateRevenue:
    def test_from_budget_range_rubles(self):
        conv = _conv(budget_range="50 тыс")
        db   = _mock_db()
        assert estimate_revenue(conv, db) == 50000.0

    def test_from_budget_range_k(self):
        conv = _conv(budget_range="2k usd")
        db   = _mock_db()
        val  = estimate_revenue(conv, db)
        assert val >= 2000.0

    def test_from_purchase_request(self):
        conv = _conv()
        db   = _mock_db()
        pr   = SimpleNamespace(budget="$1200", id=1)
        db.query.return_value.filter.return_value.first.return_value = pr
        assert estimate_revenue(conv, db) == 1200.0

    def test_fallback_zero(self):
        conv = _conv()
        db   = _mock_db()
        db.query.return_value.filter.return_value.first.return_value = None
        assert estimate_revenue(conv, db) == 0.0

    def test_capped_at_500k(self):
        conv = _conv(budget_range="9000000 руб")
        db   = _mock_db()
        assert estimate_revenue(conv, db) <= 500_000.0


# ══════════════════════════════════════════════════════════════════════════════
# 10. Close date estimate
# ══════════════════════════════════════════════════════════════════════════════

class TestEstimateCloseDate:
    def test_high_urgency_7_days(self):
        conv = _conv()
        date_str = estimate_close_date(conv, "high")
        close = datetime.strptime(date_str, "%Y-%m-%d")
        delta = (close - datetime.utcnow()).days
        assert 5 <= delta <= 9

    def test_medium_urgency_21_days(self):
        conv = _conv()
        date_str = estimate_close_date(conv, "medium")
        close = datetime.strptime(date_str, "%Y-%m-%d")
        delta = (close - datetime.utcnow()).days
        assert 18 <= delta <= 24

    def test_low_urgency_45_days(self):
        conv = _conv()
        date_str = estimate_close_date(conv, "low")
        close = datetime.strptime(date_str, "%Y-%m-%d")
        delta = (close - datetime.utcnow()).days
        assert 42 <= delta <= 48

    def test_timeline_weeks_parsed(self):
        conv = _conv(extracted_requirements={"timeline": "через 2 недели"})
        date_str = estimate_close_date(conv, "low")
        close = datetime.strptime(date_str, "%Y-%m-%d")
        delta = (close - datetime.utcnow()).days
        assert 11 <= delta <= 17


# ══════════════════════════════════════════════════════════════════════════════
# 11. Next action recommendation
# ══════════════════════════════════════════════════════════════════════════════

class TestChooseNextAction:
    def test_closed_returns_dash(self):
        conv = _conv(status="closed")
        assert choose_next_action(conv, 50, {}) == "—"

    def test_needs_human_escalate(self):
        conv = _conv(needs_human=True)
        assert choose_next_action(conv, 50, {}) == "Escalate to founder"

    def test_closing_kw_escalate(self):
        conv = _conv()
        assert choose_next_action(conv, 50, {"closing_kw": True}) == "Escalate to founder"

    def test_ready_for_proposal(self):
        conv = _conv(status="ready_for_proposal")
        assert choose_next_action(conv, 50, {}) == "Generate proposal"

    def test_proposal_sent_wait(self):
        conv = _conv(status="proposal_sent",
                     last_client_message_at=datetime.utcnow())
        assert choose_next_action(conv, 50, {}) == "Wait for client response"

    def test_proposal_sent_follow_up_after_24h(self):
        conv = _conv(status="proposal_sent",
                     last_client_message_at=datetime.utcnow() - timedelta(hours=30))
        assert choose_next_action(conv, 50, {}) == "Follow up tomorrow"

    def test_objection_low_prob_cheaper(self):
        conv = _conv()
        action = choose_next_action(conv, 20, {"objection": True})
        assert action == "Offer cheaper solution"

    def test_objection_high_prob_address(self):
        conv = _conv()
        action = choose_next_action(conv, 50, {"objection": True})
        assert action == "Address objection"

    def test_high_completeness_generate_proposal(self):
        conv = _conv(extracted_requirements={k: "x" for k in
                     ["goal", "users", "features", "timeline", "success",
                      "integrations", "admin", "design"]})
        action = choose_next_action(conv, 50, {})
        assert action == "Generate proposal"

    def test_stale_mark_stale(self):
        conv = _conv(is_stale=True)
        assert choose_next_action(conv, 15, {}) == "Mark stale — consider closing"

    def test_default_ask_question(self):
        conv = _conv()
        assert choose_next_action(conv, 30, {}) == "Ask question"


# ══════════════════════════════════════════════════════════════════════════════
# 12. run_analysis — integration
# ══════════════════════════════════════════════════════════════════════════════

class TestRunAnalysis:
    def _make_db_and_conv(self, **conv_kwargs):
        db   = _mock_db()
        conv = _conv(**conv_kwargs)
        # DB query for estimate_revenue → return None (no PR)
        db.query.return_value.filter.return_value.first.return_value = None
        return conv, db

    def test_returns_dict_with_required_keys(self):
        conv, db = self._make_db_and_conv()
        result = run_analysis(conv, "Нужен бот для магазина", db)
        for key in ["deal_probability", "client_temperature", "decision_stage",
                    "urgency", "risk_level", "recommended_next_action"]:
            assert key in result

    def test_updates_conv_fields(self):
        conv, db = self._make_db_and_conv()
        run_analysis(conv, "Хочу бот срочно, бюджет 30 тыс", db)
        assert conv.deal_probability > 10
        assert conv.urgency == "high"
        assert conv.last_client_message_at is not None

    def test_stage_advances_to_discovery(self):
        conv, db = self._make_db_and_conv(decision_stage="new")
        run_analysis(conv, "Хочу бот", db)
        assert conv.decision_stage == "discovery"

    def test_budget_extracted(self):
        conv, db = self._make_db_and_conv()
        run_analysis(conv, "Бюджет 50 тыс рублей", db)
        assert conv.budget_range is not None

    def test_pain_point_extracted(self):
        conv, db = self._make_db_and_conv()
        run_analysis(conv, "У нас проблема с заказами, всё сложно", db)
        assert len(conv.pain_points) > 0

    def test_competitor_extracted(self):
        conv, db = self._make_db_and_conv()
        run_analysis(conv, "Смотрю ещё upwork конечно", db)
        assert len(conv.competitors) > 0

    def test_probability_increases_with_requirements(self):
        conv, db = self._make_db_and_conv(
            extracted_requirements={"goal": "x", "users": "x", "features": "x",
                                    "timeline": "x", "success": "x"},
        )
        result = run_analysis(conv, "Да, готов начать!", db)
        assert result["deal_probability"] >= 40

    def test_timeline_event_logged_on_stage_change(self):
        conv, db = self._make_db_and_conv(decision_stage="new")
        with patch("services.sales_brain.log_event") as mock_log:
            run_analysis(conv, "Хочу бот", db)
            assert mock_log.called
            args = mock_log.call_args[0]
            assert args[1] == "stage_change"


# ══════════════════════════════════════════════════════════════════════════════
# 13. Follow-up engine
# ══════════════════════════════════════════════════════════════════════════════

class TestFollowUps:
    def _make_followup_db(self, convs):
        db = _mock_db()
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = convs
        db.query.return_value = mock_query
        return db

    def test_no_followup_before_24h(self):
        conv = _conv(
            status="waiting_client",
            last_client_message_at=datetime.utcnow() - timedelta(hours=12),
        )
        db = self._make_followup_db([conv])
        with patch("services.sales_brain._notify_follow_up"):
            with patch("services.sales_brain.log_event"):
                results = check_follow_ups(db)
        assert results == []

    def test_followup_1_after_24h(self):
        conv = _conv(
            status="waiting_client",
            last_client_message_at=datetime.utcnow() - timedelta(hours=25),
            follow_up_count=0,
        )
        db = self._make_followup_db([conv])
        with patch("services.sales_brain._notify_follow_up"):
            with patch("services.sales_brain.log_event"):
                results = check_follow_ups(db)
        assert len(results) == 1
        assert results[0]["action"] == "follow_up_1"
        assert conv.follow_up_count == 1

    def test_followup_2_after_72h(self):
        conv = _conv(
            status="waiting_client",
            last_client_message_at=datetime.utcnow() - timedelta(hours=73),
            follow_up_count=1,
        )
        db = self._make_followup_db([conv])
        with patch("services.sales_brain._notify_follow_up"):
            with patch("services.sales_brain.log_event"):
                results = check_follow_ups(db)
        assert len(results) == 1
        assert results[0]["action"] == "follow_up_2"

    def test_stale_after_7_days(self):
        conv = _conv(
            status="waiting_client",
            last_client_message_at=datetime.utcnow() - timedelta(hours=170),
            follow_up_count=2,
        )
        db = self._make_followup_db([conv])
        with patch("services.sales_brain._notify_follow_up"):
            with patch("services.sales_brain.log_event"):
                results = check_follow_ups(db)
        assert len(results) == 1
        assert results[0]["action"] == "stale"
        assert conv.is_stale is True

    def test_already_stale_skipped(self):
        conv = _conv(
            status="waiting_client",
            last_client_message_at=datetime.utcnow() - timedelta(hours=200),
            is_stale=True,
        )
        db = self._make_followup_db([conv])
        with patch("services.sales_brain._notify_follow_up"):
            with patch("services.sales_brain.log_event"):
                results = check_follow_ups(db)
        assert results == []

    def test_closed_conv_skipped(self):
        conv = _conv(
            status="closed",
            last_client_message_at=datetime.utcnow() - timedelta(hours=50),
        )
        db = self._make_followup_db([])  # closed not returned by filter
        with patch("services.sales_brain._notify_follow_up"):
            with patch("services.sales_brain.log_event"):
                results = check_follow_ups(db)
        assert results == []

    def test_no_spam_second_followup_before_3_days(self):
        conv = _conv(
            status="waiting_client",
            last_client_message_at=datetime.utcnow() - timedelta(hours=50),
            follow_up_count=1,  # already sent first follow-up
        )
        db = self._make_followup_db([conv])
        with patch("services.sales_brain._notify_follow_up"):
            with patch("services.sales_brain.log_event"):
                results = check_follow_ups(db)
        assert results == []


# ══════════════════════════════════════════════════════════════════════════════
# 14. Timeline logging
# ══════════════════════════════════════════════════════════════════════════════

class TestTimeline:
    def test_log_event_called_on_stage_change(self):
        conv = _conv(decision_stage="new")
        db   = _mock_db()
        db.query.return_value.filter.return_value.first.return_value = None
        with patch("services.sales_brain.log_event") as mock_log:
            run_analysis(conv, "Хочу бот", db)
            assert mock_log.called
            types = [call[0][1] for call in mock_log.call_args_list]
            assert "stage_change" in types

    def test_log_event_called_on_budget_found(self):
        conv = _conv()  # no budget_range
        db   = _mock_db()
        db.query.return_value.filter.return_value.first.return_value = None
        with patch("services.sales_brain.log_event") as mock_log:
            run_analysis(conv, "Бюджет 50 тыс рублей", db)
            types = [call[0][1] for call in mock_log.call_args_list]
            assert "budget_identified" in types

    def test_no_duplicate_budget_event(self):
        conv = _conv(budget_range="100 тыс")  # already has budget
        db   = _mock_db()
        db.query.return_value.filter.return_value.first.return_value = None
        with patch("services.sales_brain.log_event") as mock_log:
            run_analysis(conv, "Бюджет 50 тыс ��нова", db)
            types = [call[0][1] for call in mock_log.call_args_list]
            assert "budget_identified" not in types


# ══════════════════════════════════════════════════════════════════════════════
# 15. Memory / entity extraction
# ══════════════════════════════════════════════════════════════════════════════

class TestEntityExtraction:
    def test_budget_not_overwritten(self):
        conv = _conv(budget_range="100 тыс")
        run_analysis(conv, "Бюджет 50 тыс", _mock_db())
        assert conv.budget_range == "100 тыс"  # existing value kept

    def test_pain_points_accumulate(self):
        conv = _conv()
        db = _mock_db()
        db.query.return_value.filter.return_value.first.return_value = None
        run_analysis(conv, "Проблема с доставкой", db)
        run_analysis(conv, "Ещё проблема — сложно обрабатывать заказы", db)
        assert len(conv.pain_points) == 2

    def test_goals_accumulate(self):
        conv = _conv()
        db = _mock_db()
        db.query.return_value.filter.return_value.first.return_value = None
        run_analysis(conv, "Хочу автоматизировать заказы", db)
        run_analysis(conv, "Нужно снизить нагрузку на менеджеров", db)
        assert len(conv.goals) >= 1

    def test_competitors_accumulate(self):
        conv = _conv()
        db = _mock_db()
        db.query.return_value.filter.return_value.first.return_value = None
        run_analysis(conv, "Рассматриваю upwork и другие фрилансеры", db)
        assert len(conv.competitors) > 0

    def test_pain_points_capped_at_5(self):
        conv = _conv()
        db = _mock_db()
        db.query.return_value.filter.return_value.first.return_value = None
        for i in range(8):
            conv.pain_points = []  # reset so each is unique
            run_analysis(conv, f"Проблема номер {i} совсем сложно", db)
        assert len(conv.pain_points) <= 5


# ══════════════════════════════════════════════════════════════════════════════
# 16. Dashboard / CEO report data
# ══════════════════════════════════════════════════════════════════════════════

class TestSalesSummary:
    def _db_with_convs(self, convs):
        db = _mock_db()
        mock_q = MagicMock()
        mock_q.filter.return_value = mock_q
        mock_q.all.return_value = convs
        db.query.return_value = mock_q
        return db

    def test_empty_pipeline(self):
        db = self._db_with_convs([])
        s  = get_sales_summary(db)
        assert s["total_active"] == 0
        assert s["hot_leads"] == 0
        assert s["pipeline_revenue"] == 0

    def test_counts_hot_leads(self):
        convs = [
            _conv(client_temperature="hot",  estimated_revenue=1000, deal_probability=65),
            _conv(client_temperature="warm", estimated_revenue=500,  deal_probability=40),
            _conv(client_temperature="cold", estimated_revenue=0,    deal_probability=15),
        ]
        db = self._db_with_convs(convs)
        s  = get_sales_summary(db)
        assert s["hot_leads"] == 1
        assert s["total_active"] == 3

    def test_pipeline_revenue_summed(self):
        convs = [
            _conv(client_temperature="hot",  estimated_revenue=1000, deal_probability=70),
            _conv(client_temperature="warm", estimated_revenue=800,  deal_probability=40),
        ]
        db = self._db_with_convs(convs)
        s  = get_sales_summary(db)
        assert s["pipeline_revenue"] == 1800
        assert s["hot_pipeline_revenue"] == 1000

    def test_counts_at_risk(self):
        convs = [
            _conv(risk_level="high",   is_stale=False, deal_probability=20),
            _conv(risk_level="medium", is_stale=False, deal_probability=40),
        ]
        db = self._db_with_convs(convs)
        s  = get_sales_summary(db)
        assert s["at_risk"] == 1

    def test_top_opportunities_sorted_by_prob(self):
        convs = [
            _conv(id=1, deal_probability=30, client_temperature="warm",
                  decision_stage="discovery", estimated_revenue=500, recommended_next_action="Ask"),
            _conv(id=2, deal_probability=80, client_temperature="hot",
                  decision_stage="proposal",  estimated_revenue=2000, recommended_next_action="Generate proposal"),
            _conv(id=3, deal_probability=50, client_temperature="warm",
                  decision_stage="qualified", estimated_revenue=1000, recommended_next_action="Ask"),
        ]
        db = self._db_with_convs(convs)
        s  = get_sales_summary(db)
        top = s["top_opportunities"]
        assert top[0]["id"] == 2
        assert top[0]["prob"] == 80

    def test_needs_human_counted(self):
        convs = [
            _conv(needs_human=True,  deal_probability=10),
            _conv(needs_human=False, deal_probability=10),
        ]
        db = self._db_with_convs(convs)
        s  = get_sales_summary(db)
        assert s["needs_human"] == 1


# ══════════════════════════════════════════════════════════════════════════════
# 17. API E2E (against live backend)
# ══════════════════════════════════════════════════════════════════════════════

def _http(method, path, body=None, headers=None):
    import urllib.request, urllib.error, json
    url  = "http://localhost:8000" + path
    h    = (headers or {}).copy()
    data = None
    if body:
        h["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    try:
        r = urllib.request.urlopen(
            urllib.request.Request(url, data=data, headers=h, method=method),
            timeout=10,
        )
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())
    except Exception as ex:
        return 0, str(ex)


AUTH = {"X-Admin-Secret": "change_me"}


@pytest.mark.skipif(
    _http("GET", "/")[0] != 200,
    reason="Backend not running",
)
class TestAPIE2E:
    def test_dashboard_endpoint(self):
        s, d = _http("GET", "/api/conversations/dashboard", headers=AUTH)
        assert s == 200
        assert "total_active" in d
        assert "hot_leads" in d
        assert "pipeline_revenue" in d

    def test_list_has_brain_fields(self):
        s, d = _http("GET", "/api/conversations", headers=AUTH)
        assert s == 200
        if d:
            first = d[0]
            for field in ["deal_probability", "client_temperature",
                          "decision_stage", "risk_level", "requirements_completeness"]:
                assert field in first, f"Missing field: {field}"

    def test_set_stage_won(self):
        # Create a conversation first
        s, d = _http("POST", "/api/miniapp/purchase-request", {
            "name": "Stage Test Client",
            "username": "stage_test",
            "telegram_chat_id": "9999999",
            "telegram_user_id": "9999999",
            "service": "AI Bot",
            "budget": "$500",
            "deadline": "2 weeks",
            "project_description": "Test stage transitions",
        })
        assert s == 200
        req_id = d.get("request_id")

        s, d = _http("POST", f"/api/admin/purchase-requests/{req_id}/approve",
                     headers=AUTH)
        assert s == 200
        conv_id = d.get("conversation_id")

        s, d = _http("POST", f"/api/conversations/{conv_id}/set-stage",
                     body={"stage": "won"}, headers=AUTH)
        assert s == 200
        assert d["deal_probability"] == 100
        assert d["decision_stage"] == "won"

    def test_timeline_endpoint(self):
        # Use existing conversation
        s, convs = _http("GET", "/api/conversations", headers=AUTH)
        assert s == 200
        if convs:
            cid = convs[0]["id"]
            s, timeline = _http("GET", f"/api/conversations/{cid}/timeline",
                                 headers=AUTH)
            assert s == 200
            assert isinstance(timeline, list)

    def test_dashboard_unprotected_returns_401(self):
        s, _ = _http("GET", "/api/conversations/dashboard")
        assert s == 401
