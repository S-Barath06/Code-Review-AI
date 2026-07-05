# PowerShell Native .NET Web Server
function Execute-CodeLocal($code, $language) {
    $tempDir = Join-Path $PSScriptRoot "temp_execution"
    if (-not (Test-Path $tempDir)) {
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    }
    
    $stdout = ""
    $stderr = ""
    $execTimeMs = 0
    $status = "Not Run"
    
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    try {
        if ($language -eq "python" -or $language -eq "py") {
            $filePath = Join-Path $tempDir "temp.py"
            [System.IO.File]::WriteAllText($filePath, $code)
            
            $command = "python"
            if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
                $command = "py"
            }
            if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
                return @{ status = "Compiler Not Found"; error = "Python interpreter ('python' or 'py') was not found in your system's PATH variable." }
            }
            
            $pinfo = New-Object System.Diagnostics.ProcessStartInfo
            $pinfo.FileName = $command
            $pinfo.Arguments = $filePath
            $pinfo.RedirectStandardOutput = $true
            $pinfo.RedirectStandardError = $true
            $pinfo.UseShellExecute = $false
            $pinfo.CreateNoWindow = $true
            
            $p = New-Object System.Diagnostics.Process
            $p.StartInfo = $pinfo
            $p.Start() | Out-Null
            
            $exited = $p.WaitForExit(5000)
            $execTimeMs = $stopwatch.Elapsed.TotalMilliseconds
            
            if (-not $exited) {
                $p.Kill()
                return @{ status = "Timeout"; error = "Execution timed out (Max 5.0 seconds allowed)." }
            }
            
            $stdout = $p.StandardOutput.ReadToEnd()
            $stderr = $p.StandardError.ReadToEnd()
            $status = if ($p.ExitCode -eq 0) { "Success" } else { "Runtime Error" }
        }
        elseif ($language -eq "java") {
            $normalizedCode = $code
            if ($code -match "public\s+class\s+(\w+)") {
                $originalClassName = $Matches[1]
                $normalizedCode = $code -replace "public\s+class\s+$originalClassName", "public class Temp"
            }
            
            $filePath = Join-Path $tempDir "Temp.java"
            [System.IO.File]::WriteAllText($filePath, $normalizedCode)
            
            if (-not (Get-Command "javac" -ErrorAction SilentlyContinue)) {
                return @{ status = "Compiler Not Found"; error = "Java compiler ('javac') was not found in your system's PATH variable." }
            }
            
            # Compile Java
            $pinfo = New-Object System.Diagnostics.ProcessStartInfo
            $pinfo.FileName = "javac"
            $pinfo.Arguments = "`"$filePath`""
            $pinfo.RedirectStandardOutput = $true
            $pinfo.RedirectStandardError = $true
            $pinfo.UseShellExecute = $false
            $pinfo.CreateNoWindow = $true
            
            $p = New-Object System.Diagnostics.Process
            $p.StartInfo = $pinfo
            $p.Start() | Out-Null
            $p.WaitForExit() | Out-Null
            
            if ($p.ExitCode -ne 0) {
                $stderr = $p.StandardError.ReadToEnd()
                return @{ status = "Compilation Error"; error = $stderr }
            }
            
            # Run Java
            $pinfoRun = New-Object System.Diagnostics.ProcessStartInfo
            $pinfoRun.FileName = "java"
            $pinfoRun.Arguments = "-cp `"$tempDir`" Temp"
            $pinfoRun.RedirectStandardOutput = $true
            $pinfoRun.RedirectStandardError = $true
            $pinfoRun.UseShellExecute = $false
            $pinfoRun.CreateNoWindow = $true
            
            $pRun = New-Object System.Diagnostics.Process
            $pRun.StartInfo = $pinfoRun
            $pRun.Start() | Out-Null
            
            $exited = $pRun.WaitForExit(5000)
            $execTimeMs = $stopwatch.Elapsed.TotalMilliseconds
            
            if (-not $exited) {
                $pRun.Kill()
                return @{ status = "Timeout"; error = "Execution timed out (Max 5.0 seconds allowed)." }
            }
            
            $stdout = $pRun.StandardOutput.ReadToEnd()
            $stderr = $pRun.StandardError.ReadToEnd()
            $status = if ($pRun.ExitCode -eq 0) { "Success" } else { "Runtime Error" }
        }
        elseif ($language -eq "cpp" -or $language -eq "c++") {
            $filePath = Join-Path $tempDir "temp.cpp"
            $exePath = Join-Path $tempDir "temp.exe"
            [System.IO.File]::WriteAllText($filePath, $code)
            
            $compiler = "g++"
            if (-not (Get-Command $compiler -ErrorAction SilentlyContinue)) {
                $compiler = "clang++"
            }
            if (-not (Get-Command $compiler -ErrorAction SilentlyContinue)) {
                return @{ status = "Compiler Not Found"; error = "C++ compiler ('g++' or 'clang++') was not found in your system's PATH variable." }
            }
            
            # Compile C++
            $pinfo = New-Object System.Diagnostics.ProcessStartInfo
            $pinfo.FileName = $compiler
            $pinfo.Arguments = "`"$filePath`" -o `"$exePath`""
            $pinfo.RedirectStandardOutput = $true
            $pinfo.RedirectStandardError = $true
            $pinfo.UseShellExecute = $false
            $pinfo.CreateNoWindow = $true
            
            $p = New-Object System.Diagnostics.Process
            $p.StartInfo = $pinfo
            $p.Start() | Out-Null
            $p.WaitForExit() | Out-Null
            
            if ($p.ExitCode -ne 0) {
                $stderr = $p.StandardError.ReadToEnd()
                return @{ status = "Compilation Error"; error = $stderr }
            }
            
            # Run C++
            $pinfoRun = New-Object System.Diagnostics.ProcessStartInfo
            $pinfoRun.FileName = $exePath
            $pinfoRun.RedirectStandardOutput = $true
            $pinfoRun.RedirectStandardError = $true
            $pinfoRun.UseShellExecute = $false
            $pinfoRun.CreateNoWindow = $true
            
            $pRun = New-Object System.Diagnostics.Process
            $pRun.StartInfo = $pinfoRun
            $pRun.Start() | Out-Null
            
            $exited = $pRun.WaitForExit(5000)
            $execTimeMs = $stopwatch.Elapsed.TotalMilliseconds
            
            if (-not $exited) {
                $pRun.Kill()
                return @{ status = "Timeout"; error = "Execution timed out (Max 5.0 seconds allowed)." }
            }
            
            $stdout = $pRun.StandardOutput.ReadToEnd()
            $stderr = $pRun.StandardError.ReadToEnd()
            $status = if ($pRun.ExitCode -eq 0) { "Success" } else { "Runtime Error" }
        }
        elseif ($language -eq "javascript" -or $language -eq "js") {
            $filePath = Join-Path $tempDir "temp.js"
            [System.IO.File]::WriteAllText($filePath, $code)
            
            if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
                return @{ status = "Compiler Not Found"; error = "Node.js runtime ('node') was not found in your system's PATH variable." }
            }
            
            $pinfo = New-Object System.Diagnostics.ProcessStartInfo
            $pinfo.FileName = "node"
            $pinfo.Arguments = $filePath
            $pinfo.RedirectStandardOutput = $true
            $pinfo.RedirectStandardError = $true
            $pinfo.UseShellExecute = $false
            $pinfo.CreateNoWindow = $true
            
            $p = New-Object System.Diagnostics.Process
            $p.StartInfo = $pinfo
            $p.Start() | Out-Null
            
            $exited = $p.WaitForExit(5000)
            $execTimeMs = $stopwatch.Elapsed.TotalMilliseconds
            
            if (-not $exited) {
                $p.Kill()
                return @{ status = "Timeout"; error = "Execution timed out (Max 5.0 seconds allowed)." }
            }
            
            $stdout = $p.StandardOutput.ReadToEnd()
            $stderr = $p.StandardError.ReadToEnd()
            $status = if ($p.ExitCode -eq 0) { "Success" } else { "Runtime Error" }
        }
        else {
            return @{ status = "Unsupported Language"; error = "Compilation and local execution is not supported for language: $language" }
        }
    } catch {
        $status = "Execution Failed"
        $stderr = $_.Exception.Message
    } finally {
        $stopwatch.Stop()
    }
    
    return @{
        status = $status
        stdout = $stdout
        stderr = $stderr
        execTimeMs = [Math]::Round($execTimeMs, 2)
    }
}

function Get-PasswordHash($password) {
    $hasher = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($password)
    $hashBytes = $hasher.ComputeHash($bytes)
    $hashStr = [System.BitConverter]::ToString($hashBytes) -replace "-"
    return $hashStr.ToLower()
}

function Get-UserDatabasePath($username) {
    $cleanUsername = $username -replace '[^a-zA-Z0-9_]'
    $dbDir = Join-Path $PSScriptRoot "database"
    if (-not (Test-Path $dbDir)) {
        New-Item -ItemType Directory -Path $dbDir -Force | Out-Null
    }
    return Join-Path $dbDir "db_$cleanUsername.json"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8000/")
try {
    $listener.Start()
    Write-Host "PowerShell Server running at http://localhost:8000/"
    
    # Simple loop to handle requests
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $url = $request.Url.LocalPath
        
        # Handle API Status Endpoint
        if ($request.HttpMethod -eq "GET" -and $url -eq "/api/status") {
            $apiKey = $env:GROQ_API_KEY
            if ([string]::IsNullOrEmpty($apiKey)) {
                $envFilePath = Join-Path "E:\code-review-agent\backend" ".env"
                if (Test-Path $envFilePath) {
                    $envLines = Get-Content $envFilePath
                    foreach ($line in $envLines) {
                        if ($line -match "^GROQ_API_KEY=(.+)$") {
                            $apiKey = $Matches[1].Trim()
                            break
                        }
                    }
                }
            }
            
            $live = -not [string]::IsNullOrEmpty($apiKey)
            $resObj = @{ live = $live } | ConvertTo-Json
            
            $response.ContentType = "application/json; charset=utf-8"
            $responseBytes = [System.Text.Encoding]::UTF8.GetBytes($resObj)
            $response.ContentLength64 = $responseBytes.Length
            $response.OutputStream.Write($responseBytes, 0, $responseBytes.Length)
            $response.OutputStream.Close()
            continue
        }

        # Handle API Register Endpoint
        if ($request.HttpMethod -eq "POST" -and $url -eq "/api/register") {
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyText = $reader.ReadToEnd()
                $reader.Close()
                
                $body = ConvertFrom-Json $bodyText
                $username = $body.username.Trim()
                $password = $body.password.Trim()
                
                if ($username -notmatch '^[a-zA-Z0-9_]{3,15}$') {
                    $response.StatusCode = 400
                    $resObj = @{ error = "Username must be alphanumeric, between 3 and 15 characters." } | ConvertTo-Json
                } else {
                    $dbPath = Get-UserDatabasePath $username
                    if (Test-Path $dbPath) {
                        $response.StatusCode = 400
                        $resObj = @{ error = "Username already exists." } | ConvertTo-Json
                    } else {
                        $passwordHash = Get-PasswordHash $password
                        $initialDb = @{
                            username = $username
                            passwordHash = $passwordHash
                            profile = @{
                                name = $username
                                xp = 0
                                completed = @()
                            }
                            history = @()
                        }
                        $initialDbJson = ConvertTo-Json $initialDb -Depth 10
                        [System.IO.File]::WriteAllText($dbPath, $initialDbJson)
                        
                        $response.StatusCode = 200
                        $resObj = @{ success = $true; message = "Account created successfully." } | ConvertTo-Json
                    }
                }
            } catch {
                $response.StatusCode = 500
                $resObj = @{ error = "Register failure: " + $_.Exception.Message } | ConvertTo-Json
            }
            
            $response.ContentType = "application/json; charset=utf-8"
            $responseBytes = [System.Text.Encoding]::UTF8.GetBytes($resObj)
            $response.ContentLength64 = $responseBytes.Length
            $response.OutputStream.Write($responseBytes, 0, $responseBytes.Length)
            $response.OutputStream.Close()
            continue
        }

        # Handle API Login Endpoint
        if ($request.HttpMethod -eq "POST" -and $url -eq "/api/login") {
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyText = $reader.ReadToEnd()
                $reader.Close()
                
                $body = ConvertFrom-Json $bodyText
                $username = $body.username.Trim()
                $password = $body.password.Trim()
                
                $dbPath = Get-UserDatabasePath $username
                if (-not (Test-Path $dbPath)) {
                    $response.StatusCode = 401
                    $resObj = @{ error = "Invalid username or password." } | ConvertTo-Json
                } else {
                    $dbContent = Get-Content $dbPath -Raw | ConvertFrom-Json
                    $passwordHash = Get-PasswordHash $password
                    
                    if ($dbContent.passwordHash -eq $passwordHash) {
                        $response.StatusCode = 200
                        $resObj = @{
                            success = $true
                            profile = $dbContent.profile
                            history = $dbContent.history
                        } | ConvertTo-Json -Depth 10
                    } else {
                        $response.StatusCode = 401
                        $resObj = @{ error = "Invalid username or password." } | ConvertTo-Json
                    }
                }
            } catch {
                $response.StatusCode = 500
                $resObj = @{ error = "Login failure: " + $_.Exception.Message } | ConvertTo-Json
            }
            
            $response.ContentType = "application/json; charset=utf-8"
            $responseBytes = [System.Text.Encoding]::UTF8.GetBytes($resObj)
            $response.ContentLength64 = $responseBytes.Length
            $response.OutputStream.Write($responseBytes, 0, $responseBytes.Length)
            $response.OutputStream.Close()
            continue
        }

        # Handle API User Save Data Endpoint
        if ($request.HttpMethod -eq "POST" -and $url -eq "/api/user/save") {
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyText = $reader.ReadToEnd()
                $reader.Close()
                
                $body = ConvertFrom-Json $bodyText
                $username = $body.username.Trim()
                $profile = $body.profile
                $history = $body.history
                
                $dbPath = Get-UserDatabasePath $username
                if (-not (Test-Path $dbPath)) {
                    $response.StatusCode = 404
                    $resObj = @{ error = "User database file not found." } | ConvertTo-Json
                } else {
                    $dbContent = Get-Content $dbPath -Raw | ConvertFrom-Json
                    
                    # Update database properties
                    $dbContent.profile = $profile
                    $dbContent.history = $history
                    
                    $updatedDbJson = ConvertTo-Json $dbContent -Depth 10
                    [System.IO.File]::WriteAllText($dbPath, $updatedDbJson)
                    
                    $response.StatusCode = 200
                    $resObj = @{ success = $true } | ConvertTo-Json
                }
            } catch {
                $response.StatusCode = 500
                $resObj = @{ error = "Save failure: " + $_.Exception.Message } | ConvertTo-Json
            }
            
            $response.ContentType = "application/json; charset=utf-8"
            $responseBytes = [System.Text.Encoding]::UTF8.GetBytes($resObj)
            $response.ContentLength64 = $responseBytes.Length
            $response.OutputStream.Write($responseBytes, 0, $responseBytes.Length)
            $response.OutputStream.Close()
            continue
        }

        # Handle API Review Endpoint
        if ($request.HttpMethod -eq "POST" -and $url -eq "/api/review") {
            try {
                # Read POST body
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyText = $reader.ReadToEnd()
                $reader.Close()
                
                # Parse body
                $body = ConvertFrom-Json $bodyText
                $code = $body.code
                $language = $body.language
                
                # FIRST: Run local execution compiler!
                $executionResult = Execute-CodeLocal -code $code -language $language
                
                # Find API Key from .env
                $apiKey = $request.Headers["X-Groq-API-Key"]
                if ([string]::IsNullOrEmpty($apiKey)) {
                    $envFilePath = Join-Path "E:\code-review-agent\backend" ".env"
                    if (Test-Path $envFilePath) {
                        $envLines = Get-Content $envFilePath
                        foreach ($line in $envLines) {
                            if ($line -match "^GROQ_API_KEY=(.+)$") {
                                $apiKey = $Matches[1].Trim()
                                break
                            }
                        }
                    }
                }
                if ([string]::IsNullOrEmpty($apiKey)) {
                    $apiKey = $env:GROQ_API_KEY
                }
                
                $aiObj = $null
                
                if (-not [string]::IsNullOrEmpty($apiKey)) {
                    $prompt = @"
You are a high-performance software engineering agentic code reviewer. Your job is to check the efficiency (time & space complexity) of the user's code, list specific bottlenecks, write the optimized code version, and recommend compilers/engines.

User Code Language: $language
User Source Code:
$code

You MUST return ONLY a valid JSON object with NO extra text, markdown, or explanation. The JSON must have this exact structure:
{
  "efficiencyScore": <number between 0 and 100>,
  "timeComplexityOriginal": "<e.g. O(N^2)>",
  "timeComplexityOptimized": "<e.g. O(N)>",
  "spaceComplexityOriginal": "<e.g. O(1)>",
  "spaceComplexityOptimized": "<e.g. O(N)>",
  "compilerInfo": "<compiler name and version>",
  "optimizedCode": "<complete optimized code>"
}
"@
                    $payloadObj = @{
                        model = "llama-3.3-70b-versatile"
                        messages = @(
                            @{
                                role = "user"
                                content = $prompt
                            }
                        )
                        temperature = 0.3
                        max_tokens = 4096
                    }
                    $payloadJson = ConvertTo-Json $payloadObj -Depth 10 -Compress
                    
                    $groqUrl = "https://api.groq.com/openai/v1/chat/completions"
                    
                    # Force TLS 1.2
                    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
                    
                    $headers = @{
                        "Authorization" = "Bearer $apiKey"
                        "Content-Type"  = "application/json"
                    }
                    
                    try {
                        $apiResponse = Invoke-RestMethod -Uri $groqUrl -Method Post -Headers $headers -Body $payloadJson
                        $responseText = $apiResponse.choices[0].message.content
                        
                        # Strip markdown code fences if present
                        $cleanedResponse = $responseText
                        if ($responseText -match '```json\s*([\s\S]*?)\s*```') {
                            $cleanedResponse = $Matches[1]
                        } elseif ($responseText -match '```\s*([\s\S]*?)\s*```') {
                            $cleanedResponse = $Matches[1]
                        }
                        
                        $aiObj = ConvertFrom-Json $cleanedResponse
                    } catch {
                        Write-Host "Groq API execution failed: $_"
                    }
                }
                
                # Respond with wrapper JSON containing both elements
                $wrapperObj = @{
                    aiResult = $aiObj
                    execution = $executionResult
                }
                $wrapperJson = ConvertTo-Json $wrapperObj -Depth 10
                
                $response.ContentType = "application/json; charset=utf-8"
                $responseBytes = [System.Text.Encoding]::UTF8.GetBytes($wrapperJson)
                $response.ContentLength64 = $responseBytes.Length
                $response.OutputStream.Write($responseBytes, 0, $responseBytes.Length)
            } catch {
                $response.StatusCode = 500
                $errMsg = $_.Exception.Message
                if ($_.Exception.InnerException) {
                    $errMsg += " | " + $_.Exception.InnerException.Message
                }
                $errObj = @{ error = "Backend Error: $errMsg" } | ConvertTo-Json
                $responseBytes = [System.Text.Encoding]::UTF8.GetBytes($errObj)
                $response.ContentLength64 = $responseBytes.Length
                $response.OutputStream.Write($responseBytes, 0, $responseBytes.Length)
            }
            $response.OutputStream.Close()
            continue
        }
        
        if ($url -eq "/") {
            $url = "/index.html"
        }
        
        # Resolve file path
        $filePath = Join-Path "E:\code-review-agent\frontend" $url.Substring(1)
        
        if (Test-Path $filePath -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($filePath)
            
            # Content Type Mapping
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = "application/octet-stream"
            if ($ext -eq ".html") { $contentType = "text/html; charset=utf-8" }
            elseif ($ext -eq ".css") { $contentType = "text/css" }
            elseif ($ext -eq ".js") { $contentType = "application/javascript" }
            elseif ($ext -eq ".json") { $contentType = "application/json" }
            
            $response.ContentType = $contentType
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
            $err = [System.Text.Encoding]::UTF8.GetBytes("404 File Not Found")
            $response.OutputStream.Write($err, 0, $err.Length)
        }
        
        $response.OutputStream.Close()
    }
} catch {
    Write-Error $_
} finally {
    $listener.Close()
}
