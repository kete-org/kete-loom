# Sequence and alignment formats

| Format | What it holds | Coordinates | Compression and index |
|---|---|---|---|
| FASTA | sequences with `>id description` headers | n/a | `bgzip` + `samtools faidx` (`.fai`, plus `.gzi` when bgzipped) |
| FASTQ | reads: 4 lines per record (`@id`, sequence, `+`, qualities) | n/a | gzip or bgzip; no index needed for streaming |
| SAM | text alignments, header lines start with `@` | 1-based `POS` | n/a |
| BAM | binary SAM | as SAM | BGZF; coordinate-sort then `samtools index` (`.bai`, or `.csi` for very long contigs) |
| CRAM | reference-compressed alignments | as SAM | needs the same reference FASTA to decode; `.crai` index |
| VCF / BCF | variant calls per site, genotypes per sample | 1-based `POS` | `bgzip` + `bcftools index -t` (`.tbi`) or `-c` (`.csi`) |
| BED | intervals | 0-based start, end exclusive | `bgzip` + `tabix -p bed` |
| GFF3 / GTF | gene annotations | 1-based, inclusive | `bgzip` + `tabix -p gff` after sorting |

## Gotchas

- **Quality encoding.** Phred+33 is standard (Illumina 1.8+ and later, ONT, PacBio). If any quality character is below `;` (ASCII 59), the file must be Phred+33, because Phred+64 and Solexa never use those characters; FastQC's Basic Statistics module reports the encoding it used.
- **Paired-end order.** R1 and R2 must list the same reads in the same order. Tools that filter one file must filter both together (for example `fastp -i R1 -I R2 -o ... -O ...`).
- **Read names.** Some tools strip `/1` `/2` suffixes or comments after whitespace; keep names consistent across files.
- **SAM flags.** Decode with `samtools flags <n>`. Common: 4 unmapped, 256 secondary, 1024 duplicate, 2048 supplementary. Filtering primary mapped reads: `samtools view -F 0x904`.
- **pysam coordinates.** pysam is 0-based half-open (`reference_start`, `VariantRecord.start`); `VariantRecord.pos` is the 1-based VCF POS. Mixing them gives off-by-one errors.
- **Sorting.** Coordinate sort for indexing and variant calling; name sort (`samtools sort -n`) for tools that need mates adjacent, such as `samtools fixmate`.
- **VCF normalisation.** Left-align and split multi-allelic sites before comparing call sets: `bcftools norm -f ref.fa -m -any`.
- **Contig names.** `chr1` (UCSC style) vs `1` (Ensembl/NCBI style). Check with `samtools view -H` and `bcftools view -h`; rename with `bcftools annotate --rename-chrs` only after confirming the builds match.
- **bgzip vs gzip.** Indexed formats need BGZF blocks; plain `gzip` output cannot be indexed.
