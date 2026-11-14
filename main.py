"""
main.py
-------
Master CLI coordinator script for orchestrating all project phases.
Optimized with lazy imports for instant startup execution.
"""

import sys
import argparse
import subprocess

def main():
    parser = argparse.ArgumentParser(description="NO2 COVID-19 Global Research Pipeline")
    parser.add_argument("--test", action="store_true", help="Run Cairo July 2018 test extraction")
    parser.add_argument("--extract", action="store_true", help="Run full GEE data extraction")
    parser.add_argument("--analyze", action="store_true", help="Run statistical analysis pipeline")
    parser.add_argument("--dashboard", action="store_true", help="Launch Streamlit interactive dashboard")
    parser.add_argument("--all", action="store_true", help="Run end-to-end data extraction, analysis, and launch dashboard")

    args = parser.parse_args()

    if len(sys.argv) == 1:
        parser.print_help()
        sys.exit(0)

    if args.test:
        from data_collection import run_extraction
        run_extraction(test_mode=True)

    if args.extract:
        from data_collection import run_extraction
        run_extraction(test_mode=False)

    if args.analyze:
        from statistical_analysis import run_statistical_analysis
        run_statistical_analysis()

    if args.dashboard or args.all:
        if args.all:
            from data_collection import run_extraction
            from statistical_analysis import run_statistical_analysis
            run_extraction(test_mode=False)
            run_statistical_analysis()
        
        print("\n[INFO] Launching Streamlit Interactive Dashboard...")
        # Uses sys.executable to bypass Windows Application Control policy locks
        subprocess.run([sys.executable, "-m", "streamlit", "run", "dashboard.py"])

if __name__ == "__main__":
    main()