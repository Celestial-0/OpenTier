"""Generated proto package."""

import sys
from pathlib import Path

# Add generated directory to sys.path so bare `import intelligence_pb2` works
# regardless of whether imports are relative or top-level.
_pkg_dir = str(Path(__file__).parent.resolve())
if _pkg_dir not in sys.path:
    sys.path.insert(0, _pkg_dir)
