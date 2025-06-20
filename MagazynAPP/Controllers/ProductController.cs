using MagazynAPP.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MagazynAPP.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ProductController : ControllerBase
    {
        private readonly ProductContext _context;

        public ProductController(ProductContext context)
        {
            _context = context;
        }

        // Dodaj produkt
        [HttpPost]
        public async Task<IActionResult> AddProduct([FromBody] Product product)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProductById), new { id = product.Id }, product);
        }

        // Usuń produkt
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
            {
                return NotFound($"Produkt o ID {id} nie został znaleziony.");
            }

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Produkt usunięty." });
        }

        // Aktualizuj produkt
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProduct(int id, [FromBody] Product updatedProduct)
        {
            var existingProduct = await _context.Products.FindAsync(id);
            if (existingProduct == null)
            {
                return NotFound($"Produkt o ID {id} nie został znaleziony.");
            }

            // Aktualizuj właściwości produktu
            existingProduct.Name = updatedProduct.Name;
            existingProduct.Type = updatedProduct.Type;
            existingProduct.Price = updatedProduct.Price;
            existingProduct.InStock = updatedProduct.InStock;

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { message = "Produkt zaktualizowany." });
            }
            catch (DbUpdateConcurrencyException)
            {
                return StatusCode(500, "Wystąpił problem podczas aktualizacji produktu.");
            }
        }

        // Wyświetl wszystkie produkty
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Product>>> GetAllProducts()
        {
            try
            {
                var products = await _context.Products.ToListAsync();
                return Ok(products);
            }
            catch (Exception)
            {
                return StatusCode(500, "Wystąpił błąd podczas pobierania produktów.");
            }
        }

        // Wyświetl produkty po typie
        [HttpGet("type/{type}")]
        public async Task<ActionResult<IEnumerable<Product>>> GetProductsByType(string type)
        {
            try
            {
                var products = await _context.Products.Where(p => p.Type == type).ToListAsync();
                if (!products.Any())
                    return NotFound($"Brak produktów o typie: {type}");
                return Ok(products);
            }
            catch (Exception)
            {
                return StatusCode(500, "Wystąpił błąd podczas pobierania produktów po typie.");
            }
        }

        // Wyświetl produkty po ID
        [HttpGet("{id}")]
        public async Task<ActionResult<Product>> GetProductById(int id)
        {
            try
            {
                var product = await _context.Products.FindAsync(id);
                if (product == null)
                    return NotFound($"Produkt o ID {id} nie został znaleziony.");
                return Ok(product);
            }
            catch (Exception)
            {
                return StatusCode(500, "Wystąpił błąd podczas pobierania produktu.");
            }
        }

        // Wyświetl produkty po nazwie
        [HttpGet("name/{name}")]
        public async Task<ActionResult<IEnumerable<Product>>> GetProductsByName(string name)
        {
            try
            {
                var products = await _context.Products.Where(p => p.Name.Contains(name)).ToListAsync();
                if (!products.Any())
                    return NotFound($"Brak produktów o nazwie zawierającej: {name}");
                return Ok(products);
            }
            catch (Exception)
            {
                return StatusCode(500, "Wystąpił błąd podczas pobierania produktów po nazwie.");
            }
        }
    }
}