using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;

namespace MagazynAPP.Models
{
    public class ProductContext : DbContext
    {
        public DbSet<Product> Products { get; set; } = null!;

        public ProductContext(DbContextOptions<ProductContext> options) : base(options)
        {
        }
    }

}
