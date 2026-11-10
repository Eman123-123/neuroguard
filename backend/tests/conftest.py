import os
import sys
import tempfile

# Isolated DB and key BEFORE the app is imported
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest-only-0123456789"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
