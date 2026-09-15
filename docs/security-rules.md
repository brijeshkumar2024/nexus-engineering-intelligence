# Security Rule Philosophy

NEXUS findings are evidence-first. A rule should identify a concrete source pattern, provide the file/line when known, assign a confidence score, and provide remediation. A rule must never invent a CVE or claim exploitability without evidence.

Initial rule families:
- command execution from dynamic input
- obvious hardcoded secret patterns
- unsafe SQL string construction
- dangerous `eval` usage
- insecure deserialization indicators

All rules should be unit tested before being exposed as production findings.
