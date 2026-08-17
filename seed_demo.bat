@echo off
REM Lance le script de seed massif via Docker.
REM Pré-requis : Docker Desktop demarre et `docker compose up` actif.
docker compose exec backend python seed_demo.py
