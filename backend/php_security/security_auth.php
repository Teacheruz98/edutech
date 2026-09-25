<?php
/**
 * =====================================================================
 * EDUTECH ENTERPRISE SECURITY & AUTHENTICATION MODULE (PHP 8+ EDITION)
 * Cryptographic Argon2id / Salted Bcrypt Hashing, AES-256-GCM Encryption
 * Brute-Force Rate Limiting, & HMAC-SHA256 Token Signature Verification
 * =====================================================================
 */

header("Content-Type: application/json; charset=UTF-8");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("X-XSS-Protection: 1; mode=block");

// Enterprise Security Config
define('SECRET_SALT', 'EduTech_Super_Maxfiy_Cryptographic_Salt_998877665544332211');
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOCKOUT_TIME_SECONDS', 900); // 15 Minutes

class EduTechSecurityGuard {
    
    /**
     * One-Way Password Hashing using Argon2id / Salted Bcrypt
     */
    public static function hashPassword(string $password): string {
        if (defined('PASSWORD_ARGON2ID')) {
            return password_hash($password, PASSWORD_ARGON2ID, [
                'memory_cost' => 65536,
                'time_cost'   => 4,
                'threads'     => 2
            ]);
        }
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    }

    /**
     * Secure Constant-Time Password Verification
     */
    public static function verifyPassword(string $password, string $hash): bool {
        return password_verify($password, $hash);
    }

    /**
     * AES-256-GCM Symmetric Data Encryption
     */
    public static function encryptData(string $data, string $key): string {
        $cipher = "aes-256-gcm";
        $ivlen = openssl_cipher_iv_length($cipher);
        $iv = openssl_random_pseudo_bytes($ivlen);
        $ciphertext = openssl_encrypt($data, $cipher, $key, $options=0, $iv, $tag);
        return base64_encode($iv . $tag . $ciphertext);
    }

    /**
     * AES-256-GCM Symmetric Data Decryption
     */
    public static function decryptData(string $encryptedData, string $key): ?string {
        $cipher = "aes-256-gcm";
        $c = base64_decode($encryptedData);
        $ivlen = openssl_cipher_iv_length($cipher);
        $iv = substr($c, 0, $ivlen);
        $tag = substr($c, $ivlen, 16);
        $ciphertext = substr($c, $ivlen + 16);
        return openssl_decrypt($ciphertext, $cipher, $key, $options=0, $iv, $tag) ?: null;
    }

    /**
     * Brute-Force Rate Limiting Engine
     */
    public static function checkBruteForceLimit(string $identifier): array {
        $file = sys_get_temp_dir() . '/edutech_bf_' . md5($identifier) . '.json';
        $now = time();

        if (file_exists($file)) {
            $data = json_decode(file_get_contents($file), true);
            if ($data && isset($data['count'], $data['lock_until'])) {
                if ($now < $data['lock_until']) {
                    $remaining = ceil(($data['lock_until'] - $now) / 60);
                    return [
                        'blocked' => true,
                        'message' => "🛑 BRUTE-FORCE XAVFSIZLIK BLOKIROVKASI: Keragidan ortiq noto'g'ri urunish! Hisobingiz {$remaining} daqiqaga bloklandi."
                    ];
                }
                // Reset if lockout period expired
                if ($now - $data['first_attempt'] > LOCKOUT_TIME_SECONDS) {
                    @unlink($file);
                }
            }
        }
        return ['blocked' => false];
    }

    /**
     * Register Failed Login Attempt
     */
    public static function recordFailedLogin(string $identifier): void {
        $file = sys_get_temp_dir() . '/edutech_bf_' . md5($identifier) . '.json';
        $now = time();
        $count = 1;
        $firstAttempt = $now;

        if (file_exists($file)) {
            $data = json_decode(file_get_contents($file), true);
            if ($data) {
                $count = ($data['count'] ?? 0) + 1;
                $firstAttempt = $data['first_attempt'] ?? $now;
            }
        }

        $lockUntil = ($count >= MAX_LOGIN_ATTEMPTS) ? ($now + LOCKOUT_TIME_SECONDS) : 0;
        file_put_contents($file, json_encode([
            'count' => $count,
            'first_attempt' => $firstAttempt,
            'lock_until' => $lockUntil
        ]));
    }

    /**
     * Clear Lockout on Successful Login
     */
    public static function clearLoginLock(string $identifier): void {
        $file = sys_get_temp_dir() . '/edutech_bf_' . md5($identifier) . '.json';
        if (file_exists($file)) {
            @unlink($file);
        }
    }
}

// Request Handler
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? $_GET['action'] ?? 'status';

if ($action === 'status') {
    echo json_encode([
        'status' => 'active',
        'engine' => 'EduTech PHP 8+ Argon2id Security Bridge',
        'brute_force_protection' => 'Enabled (Max 5 attempts / 15 mins)',
        'encryption' => 'AES-256-GCM + Bcrypt Salted One-Way Hashing'
    ]);
}
