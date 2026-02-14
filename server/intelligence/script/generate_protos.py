import os
import subprocess
import sys


def main():
    """
    Generate Python gRPC code from protobuf definitions.
    """
    # Base paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    intelligence_root = os.path.dirname(script_dir)
    server_root = os.path.dirname(intelligence_root)
    proto_dir = os.path.join(server_root, "proto")
    proto_file = os.path.join(proto_dir, "intelligence.proto")
    output_dir = os.path.join(intelligence_root, "generated")

    print(f"Input proto: {proto_file}")
    print(f"Output dir:  {output_dir}")

    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Make sure we have an __init__.py
    init_file = os.path.join(output_dir, "__init__.py")
    if not os.path.exists(init_file):
        with open(init_file, "w") as f:
            f.write("# Generated proto package\n")

    # Command arguments
    # We include server_root/proto in include path so imports work if we had multiple protos
    # But for now it's just one file.
    cmd = [
        sys.executable,
        "-m",
        "grpc_tools.protoc",
        f"-I{proto_dir}",
        f"--python_out={output_dir}",
        f"--grpc_python_out={output_dir}",
        f"--pyi_out={output_dir}",
        "intelligence.proto",  # Relative to -I
    ]

    print(f"Running command: {' '.join(cmd)}")

    try:
        # Run command
        subprocess.check_call(cmd, cwd=intelligence_root)

        print("\nFixing imports in generated files...")
        fix_imports(output_dir)

        print("\n✅ Proto generation successful!")

    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error generating protos: {e}")
        sys.exit(1)


def fix_imports(output_dir):
    """
    Fix imports in generated files to be relative or absolute package imports.
    grpc_tools generates 'import intelligence_pb2' which fails if not in sys.path.
    We change it to 'from . import intelligence_pb2'.
    """
    for filename in os.listdir(output_dir):
        if filename.endswith("_grpc.py"):
            filepath = os.path.join(output_dir, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            # Simple replacement for our specific case
            # This is a bit hacky but standard for python grpc without separate packages
            new_content = content.replace(
                "import intelligence_pb2 as intelligence__pb2",
                "from . import intelligence_pb2 as intelligence__pb2",
            )

            if content != new_content:
                print(f"  Fixed imports in {filename}")
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)


if __name__ == "__main__":
    main()
