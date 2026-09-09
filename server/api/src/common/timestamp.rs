//! ISO-8601 UTC timestamp serialization.
//!
//! Apply `#[serde(with = "crate::common::timestamp")]` on `DateTime<Utc>`
//! fields so the wire format is always an ISO-8601 string regardless of the
//! internal representation.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Deserializer, Serialize, Serializer};

pub fn serialize<S: Serializer>(dt: &DateTime<Utc>, ser: S) -> Result<S::Ok, S::Error> {
    dt.to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
        .serialize(ser)
}

#[allow(dead_code)]
pub fn deserialize<'de, D: Deserializer<'de>>(de: D) -> Result<DateTime<Utc>, D::Error> {
    let s = String::deserialize(de)?;
    DateTime::parse_from_rfc3339(&s)
        .map(|dt| dt.with_timezone(&Utc))
        .map_err(serde::de::Error::custom)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Serialize, Deserialize, PartialEq, Debug)]
    struct Sample {
        #[serde(with = "crate::common::timestamp")]
        at: DateTime<Utc>,
    }

    #[test]
    fn roundtrips_iso8601() {
        // Millisecond-precision: truncate sub-ms digits before comparing.
        let now_ms = Utc::now().timestamp_millis();
        let s = Sample {
            at: chrono::DateTime::from_timestamp_millis(now_ms).unwrap(),
        };
        let json = serde_json::to_string(&s).unwrap();
        assert!(json.contains("T") && json.contains("Z"));
        let back: Sample = serde_json::from_str(&json).unwrap();
        assert_eq!(s, back);
    }
}
