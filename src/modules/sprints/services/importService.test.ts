import { parseFeatureText, parseCSVText } from './importService'

// ─── Helper: access private `sanitize` via parseFeatureText side-effects ─────
// sanitize is not exported, so we test it indirectly through parseFeatureText
// by passing strings with special chars as feature/scenario names.

describe('sanitize (tested indirectly)', () => {
  it('escapes HTML entities in feature names', () => {
    const input = 'Feature: <script>alert("xss")</script>'
    const result = parseFeatureText(
      `${input}\n  Scenario: test`,
      1,
    )
    const name = result.features[0].name
    expect(name).toContain('&lt;')
    expect(name).toContain('&gt;')
    expect(name).toContain('&quot;')
    expect(name).not.toContain('<script>')
  })

  it('escapes ampersand', () => {
    const result = parseFeatureText(
      "Feature: A & B\n  Scenario: test",
      1,
    )
    expect(result.features[0].name).toBe('A &amp; B')
  })

  it('escapes single quotes', () => {
    const result = parseFeatureText(
      "Feature: it's a test\n  Scenario: test",
      1,
    )
    expect(result.features[0].name).toBe('it&#x27;s a test')
  })

  it('handles empty string (feature with no name gets default)', () => {
    const result = parseFeatureText(
      "Feature:\n  Scenario: test",
      1,
    )
    expect(result.features[0].name).toBe('Nova Funcionalidade Importada')
  })

  it('escapes special characters in scenario names', () => {
    const result = parseFeatureText(
      'Feature: Feat\n  Scenario: check <value> & "quote"',
      1,
    )
    const caseName = result.features[0].cases[0].name
    expect(caseName).toContain('&lt;')
    expect(caseName).toContain('&amp;')
    expect(caseName).toContain('&quot;')
  })
})

// ─── parseFeatureText ────────────────────────────────────────────────────────

describe('parseFeatureText', () => {
  const SUITE_ID = 42

  it('parses a single feature with scenarios', () => {
    const input = [
      'Feature: Login',
      '  Scenario: Valid credentials',
      '    Given a registered user',
      '    When they log in',
      '    Then they see the dashboard',
      '  Scenario: Invalid password',
      '    Given a registered user',
      '    When they enter wrong password',
      '    Then they see an error',
    ].join('\n')

    const result = parseFeatureText(input, SUITE_ID)

    expect(result.features).toHaveLength(1)
    expect(result.features[0].name).toBe('Login')
    expect(result.features[0].suiteId).toBe(SUITE_ID)
    expect(result.features[0].cases).toHaveLength(2)
    expect(result.totalScenarios).toBe(2)
    expect(result.summary).toHaveLength(1)
    expect(result.summary[0]).toContain('Login')
    expect(result.summary[0]).toContain('2 cenário(s)')
  })

  it('parses multiple features', () => {
    const input = [
      'Feature: Login',
      '  Scenario: Valid login',
      '    Given user exists',
      'Feature: Registration',
      '  Scenario: New user',
      '    Given no account',
      '  Scenario: Duplicate email',
      '    Given existing email',
    ].join('\n')

    const result = parseFeatureText(input, SUITE_ID)

    expect(result.features).toHaveLength(2)
    expect(result.features[0].name).toBe('Login')
    expect(result.features[0].cases).toHaveLength(1)
    expect(result.features[1].name).toBe('Registration')
    expect(result.features[1].cases).toHaveLength(2)
    expect(result.totalScenarios).toBe(3)
  })

  it('handles Feature with Background section (Background lines are part of scenario gherkin)', () => {
    const input = [
      'Feature: Auth',
      '  Background:',
      '    Given a clean database',
      '  Scenario: Login',
      '    When user logs in',
      '    Then success',
    ].join('\n')

    const result = parseFeatureText(input, SUITE_ID)

    expect(result.features).toHaveLength(1)
    expect(result.features[0].cases).toHaveLength(1)
    expect(result.features[0].cases[0].name).toBe('Login')
    // Background lines are not captured as a scenario
  })

  it('parses Scenario Outline with Examples', () => {
    const input = [
      'Feature: Calculator',
      '  Scenario Outline: Addition',
      '    Given I have <a>',
      '    When I add <b>',
      '    Then result is <sum>',
      '    Examples:',
      '      | a | b | sum |',
      '      | 1 | 2 | 3   |',
      '      | 5 | 5 | 10  |',
    ].join('\n')

    const result = parseFeatureText(input, SUITE_ID)

    expect(result.features).toHaveLength(1)
    expect(result.features[0].cases).toHaveLength(1)
    expect(result.features[0].cases[0].name).toBe('Addition')
    expect(result.features[0].cases[0].gherkin).toContain('Examples:')
    expect(result.features[0].cases[0].gherkin).toContain('| 1 | 2 | 3   |')
  })

  it('parses tags before scenarios (tags become part of gherkin of next scenario)', () => {
    const input = [
      'Feature: Payments',
      '  @smoke @critical',
      '  Scenario: Pay with card',
      '    Given a cart',
      '    When paying with card',
      '    Then payment succeeds',
    ].join('\n')

    const result = parseFeatureText(input, SUITE_ID)

    // Tags before a scenario are not recognized as a scenario keyword,
    // so they won't create a separate scenario. They end up in the previous
    // scenario's gherkin or are ignored if there's no current scenario.
    expect(result.features).toHaveLength(1)
    expect(result.features[0].cases).toHaveLength(1)
    expect(result.features[0].cases[0].name).toBe('Pay with card')
  })

  it('returns empty features array for empty input', () => {
    const result = parseFeatureText('', SUITE_ID)

    expect(result.features).toHaveLength(0)
    expect(result.totalScenarios).toBe(0)
    expect(result.summary).toHaveLength(0)
  })

  it('returns empty features for malformed Gherkin without Feature keyword', () => {
    const input = 'Just some random text\nwithout any keywords'
    const result = parseFeatureText(input, SUITE_ID)

    expect(result.features).toHaveLength(0)
    expect(result.totalScenarios).toBe(0)
  })

  it('creates default feature name when scenario appears before any Feature keyword', () => {
    const input = [
      'Scenario: Orphan scenario',
      '  Given something',
    ].join('\n')

    const result = parseFeatureText(input, SUITE_ID)

    expect(result.features).toHaveLength(1)
    expect(result.features[0].name).toBe('Nova Funcionalidade Importada')
    expect(result.features[0].cases).toHaveLength(1)
  })

  it('supports Portuguese keywords (Funcionalidade / Cenario)', () => {
    const input = [
      'Funcionalidade: Login',
      '  Cenário: Credenciais válidas',
      '    Dado um usuário registrado',
    ].join('\n')

    const result = parseFeatureText(input, SUITE_ID)

    expect(result.features).toHaveLength(1)
    expect(result.features[0].name).toBe('Login')
    expect(result.features[0].cases[0].name).toBe('Credenciais válidas')
  })

  it('supports Esquema do Cenário keyword', () => {
    const input = [
      'Funcionalidade: Calc',
      '  Esquema do Cenário: Soma',
      '    Dado <a> e <b>',
    ].join('\n')

    const result = parseFeatureText(input, SUITE_ID)

    expect(result.features[0].cases).toHaveLength(1)
    expect(result.features[0].cases[0].name).toBe('Soma')
  })

  it('sets default values on each test case', () => {
    const input = 'Feature: F\n  Scenario: S\n    Given x'
    const result = parseFeatureText(input, SUITE_ID)
    const tc = result.features[0].cases[0]

    expect(tc.complexity).toBe('Baixa')
    expect(tc.status).toBe('Pendente')
    expect(tc.executionDay).toBe('')
    expect(tc.id).toBeDefined()
  })
})

// ─── parseCSVRaw (tested indirectly through parseCSVText) ────────────────────

describe('parseCSVText — CSV parsing', () => {
  const SUITE_ID = 10

  it('parses a simple CSV with feature and scenario columns', () => {
    const csv = [
      'feature,scenario',
      'Login,Valid credentials',
      'Login,Invalid password',
      'Register,New user',
    ].join('\n')

    const result = parseCSVText(csv, SUITE_ID)

    expect(result.features).toHaveLength(2)
    expect(result.totalScenarios).toBe(3)
    expect(result.features[0].name).toBe('Login')
    expect(result.features[0].cases).toHaveLength(2)
    expect(result.features[1].name).toBe('Register')
    expect(result.features[1].cases).toHaveLength(1)
  })

  it('handles quoted fields with commas inside', () => {
    const csv = [
      'feature,scenario',
      '"Feature, with comma","Scenario, also comma"',
    ].join('\n')

    const result = parseCSVText(csv, SUITE_ID)

    expect(result.features).toHaveLength(1)
    // sanitize escapes the comma-containing names but commas are not HTML entities
    expect(result.features[0].name).toContain('Feature, with comma')
    expect(result.features[0].cases[0].name).toContain('Scenario, also comma')
  })

  it('handles empty fields — rows with empty scenario are skipped', () => {
    const csv = [
      'feature,scenario',
      'Login,Valid login',
      'Login,',
      'Register,New user',
    ].join('\n')

    const result = parseCSVText(csv, SUITE_ID)

    // Row with empty scenario name is skipped (scenarioName check in buildFromRows)
    expect(result.totalScenarios).toBe(2)
  })

  it('handles newlines inside quoted fields', () => {
    const csv = [
      'feature,scenario,gherkin',
      'Login,Valid login,"Given user\nWhen login\nThen ok"',
    ].join('\n')

    const result = parseCSVText(csv, SUITE_ID)

    expect(result.features).toHaveLength(1)
    expect(result.features[0].cases[0].gherkin).toContain('Given user\nWhen login\nThen ok')
  })

  it('handles escaped quotes (doubled) inside quoted fields', () => {
    const csv = [
      'feature,scenario',
      'Login,"Scenario with ""quotes"" inside"',
    ].join('\n')

    const result = parseCSVText(csv, SUITE_ID)

    expect(result.features[0].cases[0].name).toContain('Scenario with &quot;quotes&quot; inside')
  })

  it('parses standard columns including gherkin and complexity', () => {
    const csv = [
      'feature,scenario,gherkin,complexidade',
      'Login,Valid login,Given user exists,Alta',
      'Login,Invalid login,Given user exists,Moderada',
    ].join('\n')

    const result = parseCSVText(csv, SUITE_ID)

    expect(result.features[0].cases[0].gherkin).toBe('Given user exists')
    expect(result.features[0].cases[0].complexity).toBe('Alta')
    expect(result.features[0].cases[1].complexity).toBe('Moderada')
  })

  it('defaults complexity to Baixa when column is missing', () => {
    const csv = [
      'feature,scenario',
      'Login,Test case',
    ].join('\n')

    const result = parseCSVText(csv, SUITE_ID)

    expect(result.features[0].cases[0].complexity).toBe('Baixa')
  })

  it('defaults complexity to Baixa for invalid values', () => {
    const csv = [
      'feature,scenario,complexidade',
      'Login,Test case,Extrema',
    ].join('\n')

    const result = parseCSVText(csv, SUITE_ID)

    expect(result.features[0].cases[0].complexity).toBe('Baixa')
  })

  it('handles missing optional gherkin column', () => {
    const csv = [
      'feature,scenario',
      'Login,Test case',
    ].join('\n')

    const result = parseCSVText(csv, SUITE_ID)

    expect(result.features[0].cases[0].gherkin).toBe('')
  })

  it('skips empty rows', () => {
    const csv = [
      'feature,scenario',
      '',
      'Login,Valid login',
      '',
      'Register,New user',
      '',
    ].join('\n')

    const result = parseCSVText(csv, SUITE_ID)

    expect(result.totalScenarios).toBe(2)
  })

  it('throws on empty CSV', () => {
    expect(() => parseCSVText('', SUITE_ID)).toThrow('vazio ou inválido')
  })

  it('throws on CSV with only header', () => {
    expect(() => parseCSVText('feature,scenario', SUITE_ID)).toThrow('vazio ou inválido')
  })

  it('throws on CSV with single column', () => {
    const csv = 'feature\nLogin'
    expect(() => parseCSVText(csv, SUITE_ID)).toThrow('pelo menos 2 colunas')
  })

  it('throws when all scenario fields are empty', () => {
    const csv = [
      'feature,scenario',
      'Login,',
      'Register,',
    ].join('\n')

    expect(() => parseCSVText(csv, SUITE_ID)).toThrow('Nenhum cenário encontrado')
  })

  it('sets correct suiteId on all features', () => {
    const csv = [
      'feature,scenario',
      'A,Test 1',
      'B,Test 2',
    ].join('\n')

    const result = parseCSVText(csv, SUITE_ID)

    result.features.forEach((f) => {
      expect(f.suiteId).toBe(SUITE_ID)
    })
  })

  it('generates summary with correct counts', () => {
    const csv = [
      'feature,scenario',
      'Login,T1',
      'Login,T2',
      'Register,T3',
    ].join('\n')

    const result = parseCSVText(csv, SUITE_ID)

    expect(result.summary).toHaveLength(2)
    expect(result.summary[0]).toContain('Login')
    expect(result.summary[0]).toContain('2 cenário(s)')
    expect(result.summary[1]).toContain('Register')
    expect(result.summary[1]).toContain('1 cenário(s)')
  })

  it('handles CRLF line endings', () => {
    const csv = 'feature,scenario\r\nLogin,Test case\r\n'

    const result = parseCSVText(csv, SUITE_ID)

    expect(result.totalScenarios).toBe(1)
    expect(result.features[0].cases[0].name).toBe('Test case')
  })
})
