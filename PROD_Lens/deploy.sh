#!/bin/bash
# Lens PROD Docker Deployment & Backup Script (Linux)
# Run this script from inside the PROD_Lens folder.

set -e

if [ ! -f .env ]; then
    echo "Error: .env file not found in PROD_Lens!"
    echo "Please create .env with the required environment variables."
    exit 1
fi

backup_dir="backups"
container="lens_dev_postgres"
db_name="lens_project_db"
db_user="postgres"

create_backup() {
    echo ""
    echo "========================================"
    echo "Creating Database Backup"
    echo "========================================"
    mkdir -p "$backup_dir"
    timestamp=$(date +%Y-%m-%d_%H%M%S)
    backup_file="$backup_dir/lens_prod_backup_${timestamp}.sql"

    echo "Creating backup: $backup_file"
    if docker exec -i "$container" pg_dump -U "$db_user" --data-only --column-inserts "$db_name" > "$backup_file"; then
        echo "Database backup created successfully!"
        echo "Location: $backup_file"
    else
        echo "Backup failed! Please check if the database container is running."
        rm -f "$backup_file"
        return 1
    fi

    echo "Cleaning up old backups (keeping last 5)..."
    ls -1t "$backup_dir"/lens_prod_backup_*.sql 2>/dev/null | tail -n +6 | while read -r old; do
        rm -f "$old"
        echo "Deleted old backup: $old"
    done
}

restore_backup() {
    echo ""
    echo "========================================"
    echo "Database Backup Restore"
    echo "========================================"

    if [ ! -d "$backup_dir" ]; then
        echo "Error: Backups folder not found!"
        return 1
    fi

    mapfile -t files < <(ls -1t "$backup_dir"/*.sql 2>/dev/null)
    if [ ${#files[@]} -eq 0 ]; then
        echo "No backup files found in the backups folder!"
        return 1
    fi

    echo "Available backup files:"
    for i in "${!files[@]}"; do
        echo "[$((i+1))] $(basename "${files[$i]}")"
    done

    echo ""
    read -p "Enter the number of the backup file to restore [0 to cancel]: " choice
    if [ "$choice" = "0" ]; then
        return 0
    fi
    if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt ${#files[@]} ]; then
        echo "Invalid backup file selection!"
        return 1
    fi

    selected_file="${files[$((choice-1))]}"

    echo ""
    echo "========================================"
    echo "WARNING: This will overwrite existing data!"
    echo "Selected file: $selected_file"
    echo "========================================"
    read -p "Are you sure you want to continue? (y/n): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "Restore cancelled."
        return 0
    fi

    echo "Clearing existing data and restoring from backup..."
    temp_restore="$(mktemp)"
    {
        echo "BEGIN;"
        echo "SET session_replication_role = 'replica';"
        echo "DO \$\$ DECLARE"
        echo "    r RECORD;"
        echo "BEGIN"
        echo "    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP"
        echo "        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';"
        echo "    END LOOP;"
        echo "END \$\$;"
        cat "$selected_file"
        echo "SET session_replication_role = 'origin';"
        echo "COMMIT;"
    } > "$temp_restore"

    if docker exec -i "$container" psql -U "$db_user" -d "$db_name" < "$temp_restore"; then
        echo "Database restored successfully!"
    else
        echo "Restore failed! Please check the error messages above."
    fi
    rm -f "$temp_restore"
}

show_menu() {
    echo "========================================"
    echo "Lens PROD Docker Deployment"
    echo "========================================"
    echo ""
    echo "1) Frontend  (build + start frontend only)"
    echo "2) Backend   (build + start backend only)"
    echo "3) Full      (build + start all services)"
    echo "4) Stop all services"
    echo "5) View logs"
    echo "6) Restart services"
    echo "7) Create Database Backup"
    echo "8) Restore Database from Backup"
    echo "0) Exit"
    echo ""
}

while true; do
    show_menu
    read -p "Enter choice [0-8]: " choice
    case $choice in
        1)
            echo ""
            echo "Building and starting frontend..."
            docker-compose down frontend
            docker load -i clair.tar
            docker-compose up -d frontend
            echo "Frontend deployment completed!"
            ;;
        2)
            echo ""
            echo "Building and starting backend..."
            docker-compose down backend
            docker load -i clair.tar
            docker-compose up -d backend
            echo "Backend deployment completed!"
            ;;
        3)
            echo ""
            echo "Building and starting all services..."
            docker-compose down
            docker load -i clair.tar
            docker-compose up -d
            echo "Full deployment completed!"
            echo "Service URLs:"
            echo "  - Frontend: http://localhost:6002"
            echo "  - Backend:  http://localhost:6001"
            echo "  - PgAdmin:  http://localhost:6004"
            echo "  - Database: localhost:6003"
            ;;
        4)
            echo ""
            echo "Stopping all services..."
            docker-compose down
            echo "Services stopped!"
            ;;
        5)
            echo ""
            echo "Showing logs (Ctrl+C to exit)..."
            docker-compose logs -f
            ;;
        6)
            echo ""
            echo "Restarting services..."
            docker-compose restart
            echo "Services restarted!"
            ;;
        7)
            create_backup
            ;;
        8)
            restore_backup
            ;;
        0)
            exit 0
            ;;
        *)
            echo "Invalid choice!"
            ;;
    esac
    echo ""
    read -p "Press Enter to continue..." _
done
