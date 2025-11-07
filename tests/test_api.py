import copy
import pytest

from fastapi.testclient import TestClient

from src.app import app, activities


@pytest.fixture(autouse=True)
def reset_activities():
    # make a deep copy of the in-memory DB and restore after each test
    original = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(original)


def test_get_activities_returns_200_and_structure():
    client = TestClient(app)
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"]["participants"], list)


def test_signup_adds_participant_and_reflected_immediately():
    client = TestClient(app)
    activity = "Chess Club"
    email = "pytest_user@example.com"

    # ensure not already present
    resp = client.get("/activities")
    assert email not in resp.json()[activity]["participants"]

    # signup
    post = client.post(f"/activities/{activity}/signup?email={email}")
    assert post.status_code == 200

    # fetch again and verify present
    resp2 = client.get("/activities")
    assert email in resp2.json()[activity]["participants"]


def test_duplicate_signup_rejected():
    client = TestClient(app)
    activity = "Chess Club"
    email = "duplicate_user@example.com"

    r1 = client.post(f"/activities/{activity}/signup?email={email}")
    assert r1.status_code == 200

    # duplicate
    r2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert r2.status_code == 400


def test_remove_participant_endpoint():
    client = TestClient(app)
    activity = "Chess Club"
    email = "to_remove@example.com"

    # add
    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200

    # remove
    d = client.delete(f"/activities/{activity}/participants?email={email}")
    assert d.status_code == 200

    # ensure gone
    resp = client.get("/activities")
    assert email not in resp.json()[activity]["participants"]
