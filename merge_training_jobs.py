#!/usr/bin/env python3
"""
Script to merge test-model-training-page into rhoai-3.0
This brings the full training jobs feature with RayJob support to rhoai-3.0
"""
import subprocess
import sys
import os

def run_cmd(cmd, check=True):
    """Run a git command and return result"""
    print(f"→ Running: {cmd}")
    result = subprocess.run(
        cmd,
        shell=True,
        cwd='/Users/lfitzger/RHOAI/odh-dashboard',
        capture_output=True,
        text=True
    )
    
    if result.stdout:
        print(result.stdout)
    if result.stderr and result.returncode != 0:
        print(f"ERROR: {result.stderr}", file=sys.stderr)
    
    if check and result.returncode != 0:
        sys.exit(result.returncode)
    
    return result

def main():
    print("=" * 60)
    print("Merging Training Jobs Feature to rhoai-3.0")
    print("=" * 60)
    
    # Step 1: Check current status
    print("\n[1/7] Checking current git status...")
    status = run_cmd("git status --short")
    
    if status.stdout.strip():
        print("\n⚠️  You have uncommitted changes:")
        print(status.stdout)
        response = input("\nDo you want to stash these changes? (y/n): ")
        if response.lower() == 'y':
            run_cmd("git stash push -m 'Pre-merge stash'")
            print("✓ Changes stashed")
        else:
            print("Please commit or stash your changes first.")
            sys.exit(1)
    else:
        print("✓ Working directory is clean")
    
    # Step 2: Get current branch
    print("\n[2/7] Checking current branch...")
    current_branch = run_cmd("git branch --show-current").stdout.strip()
    print(f"Current branch: {current_branch}")
    
    # Step 3: Fetch latest
    print("\n[3/7] Fetching latest changes...")
    run_cmd("git fetch origin", check=False)
    
    # Step 4: Checkout rhoai-3.0
    print("\n[4/7] Checking out rhoai-3.0...")
    run_cmd("git checkout rhoai-3.0")
    print("✓ On rhoai-3.0 branch")
    
    # Step 5: Create feature branch
    feature_branch = "feature/training-jobs-with-rayjob"
    print(f"\n[5/7] Creating feature branch: {feature_branch}...")
    
    # Delete if exists
    run_cmd(f"git branch -D {feature_branch}", check=False)
    
    run_cmd(f"git checkout -b {feature_branch}")
    print(f"✓ Created and switched to {feature_branch}")
    
    # Step 6: Merge test-model-training-page
    print("\n[6/7] Merging test-model-training-page...")
    print("This will bring over:")
    print("  - Full model-training-v1 implementation")
    print("  - Full model-training-v2 implementation")
    print("  - RayJob support")
    print("  - All training jobs UI components")
    print()
    
    merge_result = run_cmd(
        "git merge test-model-training-page --no-ff -m 'Merge training jobs feature with RayJob support from test-model-training-page'",
        check=False
    )
    
    if merge_result.returncode != 0:
        print("\n⚠️  Merge has conflicts!")
        print("\nConflicts need to be resolved manually:")
        run_cmd("git status")
        print("\nTo resolve conflicts:")
        print("  1. Open the conflicted files")
        print("  2. Resolve the conflicts")
        print("  3. Stage the resolved files: git add <files>")
        print("  4. Complete the merge: git commit")
        print(f"  5. Return to this script or continue manually")
        sys.exit(1)
    else:
        print("✓ Merge completed successfully with no conflicts!")
    
    # Step 7: Show what was merged
    print("\n[7/7] Summary of changes...")
    run_cmd("git diff --stat rhoai-3.0..HEAD")
    
    print("\n" + "=" * 60)
    print("✅ SUCCESS!")
    print("=" * 60)
    print(f"\nYou are now on branch: {feature_branch}")
    print("\nNext steps:")
    print("  1. Test the build: npm install && npm run build")
    print("  2. Verify training jobs UI works")
    print("  3. Test RayJob support")
    print("  4. If all looks good: git push origin", feature_branch)
    print("  5. Create PR to merge into rhoai-3.0")
    print("\nTo go back to your original branch:")
    print(f"  git checkout {current_branch}")

if __name__ == "__main__":
    main()

