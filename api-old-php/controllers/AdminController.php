<?php
// api/controllers/AdminController.php

require_once __DIR__ . '/../config/Database.php';

class AdminController {
    public static function getPending() {
        $db = Database::getInstance();
        return $db->query("SELECT w.*, u.name as author FROM words w JOIN users u ON w.added_by = u.id WHERE w.status = 'pending'")->fetchAll();
    }

    public static function approve($id) {
        $db = Database::getInstance();
        $stmt = $db->prepare("UPDATE words SET status = 'approved' WHERE id = ?");
        return ["success" => $stmt->execute([$id])];
    }

    public static function reject($id) {
        $db = Database::getInstance();
        $stmt = $db->prepare("DELETE FROM words WHERE id = ?");
        return ["success" => $stmt->execute([$id])];
    }
}
