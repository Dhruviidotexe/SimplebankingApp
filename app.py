"""
Flask REST API Backend for ABC Bank
------------------------------------
Wraps the CLI banking logic from Pythonmain.py into a RESTful JSON API.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

# ---------------------------------------------------------------------------
# Banking Logic (ported from Pythonmain.py)
# ---------------------------------------------------------------------------

balance = 0.0
kyc_documents = {}  # { "doc_type": "doc_number/value", ... }
transactions = []   # list of dicts for transaction history


def deposit(amount):
    """Deposit a positive amount. Returns (success: bool, message: str)."""
    global balance
    if amount > 0:
        balance += amount
        return True, f"{amount} deposited successfully."
    return False, "Cannot deposit a negative or zero amount."


def withdraw(amount):
    """Withdraw an amount. Returns (success: bool, message: str)."""
    global balance
    if amount <= 0:
        return False, "Cannot withdraw a negative or zero amount."
    if amount > balance:
        return False, "Insufficient balance for this withdrawal."
    balance -= amount
    return True, f"{amount} withdrawn successfully."


def add_transaction(transaction_type, amount, description=""):
    """Append a transaction record to the history."""
    global transactions
    transactions.append({
        "id": len(transactions) + 1,
        "type": transaction_type,       # "deposit" | "withdraw"
        "amount": amount,
        "description": description,
        "timestamp": datetime.now().isoformat(),
    })


# ---------------------------------------------------------------------------
# Flask Application
# ---------------------------------------------------------------------------

app = Flask(__name__)
CORS(app)  # allow cross-origin requests from the frontend


# ── Balance ────────────────────────────────────────────────────────────────

@app.route("/api/balance", methods=["GET"])
def get_balance():
    """Return the current account balance."""
    return jsonify({"balance": balance})


# ── Deposit ────────────────────────────────────────────────────────────────

@app.route("/api/deposit", methods=["POST"])
def handle_deposit():
    """Deposit money into the account."""
    data = request.get_json(silent=True) or {}
    amount = data.get("amount")

    if amount is None or not isinstance(amount, (int, float)):
        return jsonify({"success": False, "message": "A valid numeric amount is required."}), 400

    success, message = deposit(amount)
    if success:
        add_transaction("deposit", amount, "Deposit via web app")
        return jsonify({"success": True, "message": message, "balance": balance})
    else:
        return jsonify({"success": False, "message": message, "balance": balance}), 400


# ── Withdraw ───────────────────────────────────────────────────────────────

@app.route("/api/withdraw", methods=["POST"])
def handle_withdraw():
    """Withdraw money from the account."""
    data = request.get_json(silent=True) or {}
    amount = data.get("amount")

    if amount is None or not isinstance(amount, (int, float)):
        return jsonify({"success": False, "message": "A valid numeric amount is required."}), 400

    success, message = withdraw(amount)
    if success:
        add_transaction("withdraw", -amount, "Withdrawal via web app")
        return jsonify({"success": True, "message": message, "balance": balance})
    else:
        return jsonify({"success": False, "message": message, "balance": balance}), 400


# ── KYC Documents ──────────────────────────────────────────────────────────

@app.route("/api/kyc", methods=["GET"])
def get_kyc():
    """Return the list of KYC documents."""
    docs_list = [{"type": doc_type, "name": doc_value} for doc_type, doc_value in kyc_documents.items()]
    return jsonify({"documents": docs_list, "count": len(docs_list)})


@app.route("/api/kyc", methods=["POST"])
def add_kyc():
    """Add a new KYC document."""
    data = request.get_json(silent=True) or {}
    doc_type = data.get("type", "").strip()
    doc_name = data.get("name", "").strip()

    if not doc_type:
        return jsonify({"success": False, "message": "Document type is required."}), 400
    if not doc_name:
        return jsonify({"success": False, "message": "Document name/value is required."}), 400
    if doc_type in kyc_documents:
        return jsonify({"success": False, "message": f"{doc_type} is already saved."}), 409

    kyc_documents[doc_type] = doc_name
    return jsonify({
        "success": True,
        "message": f"{doc_type} added successfully.",
        "documents": [{"type": t, "name": v} for t, v in kyc_documents.items()],
    })


@app.route("/api/kyc/<path:doc_name>", methods=["DELETE"])
def remove_kyc(doc_name):
    """Remove a KYC document by its name/value."""
    to_delete = None
    for doc_type, doc_value in kyc_documents.items():
        if doc_value == doc_name or doc_type == doc_name:
            to_delete = doc_type
            break

    if to_delete is None:
        return jsonify({"success": False, "message": "Document not found."}), 404

    del kyc_documents[to_delete]
    return jsonify({
        "success": True,
        "message": f"{to_delete} removed successfully.",
        "documents": [{"type": t, "name": v} for t, v in kyc_documents.items()],
    })


# ── Transactions ───────────────────────────────────────────────────────────

@app.route("/api/transactions", methods=["GET"])
def get_transactions():
    """Return the transaction history."""
    return jsonify({"transactions": transactions})


# ── Reset (for testing convenience) ────────────────────────────────────────

@app.route("/api/reset", methods=["POST"])
def reset_account():
    """Reset balance, KYC, and transactions to defaults."""
    global balance, kyc_documents, transactions
    balance = 0.0
    kyc_documents = {}
    transactions = []
    return jsonify({"success": True, "message": "Account has been reset."})


# ── Entry point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("🚀 ABC Bank API server running at http://127.0.0.1:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)
